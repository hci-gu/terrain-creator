const axios = require('axios')
const ee = require('@google/earthengine')
const privateKey = require('./service_account.json')
const tilebelt = require('@mapbox/tilebelt')
const PocketBase = require('pocketbase/cjs')
const { promiseSeries, stitchTileImages } = require('../utils.js')
const eventsource = require('eventsource')
const { generateElevationImage } = require('../geotiff/index.js')

if (typeof process !== 'undefined' && process.release.name === 'node') {
  global.EventSource = eventsource
}
const pb = new PocketBase(process.env.PB_URL)

const downloadTile = async (url, tile) => {
  const [x, y, zoom] = tile
  let requestUrl = url.replace('{x}', x).replace('{y}', y).replace('{z}', zoom)

  const response = await axios.get(requestUrl, {
    responseType: 'arraybuffer',
  })

  return response.data
}

let cachedEEInstance = {
  date: null,
  instance: null,
}
const getLandcoverMap = (ee) => {
  return new Promise((resolve) => {
    const dynamicworld = ee
      .ImageCollection('GOOGLE/DYNAMICWORLD/V1')
      .filterDate('2023-01-01', '2023-08-20')

    const classification = dynamicworld.select('label')
    const dwVisParams = {
      min: 0,
      max: 8,
      palette: [
        '#419BDF',
        '#397D49',
        '#88B053',
        '#7A87C6',
        '#E49635',
        '#DFC35A',
        '#C4281B',
        '#A59B8F',
        '#B39FE1',
      ],
    }

    classification.getMap(dwVisParams, function (map) {
      resolve(map)
    })
  })
}

const getWaterTemperatureMap = (ee) => {
  return new Promise((resolve) => {
    const salinity = ee
      .ImageCollection('HYCOM/sea_temp_salinity')
      .filter(ee.Filter.date('2018-08-01', '2018-08-15'))

    // Select water temperature at 0 meters and scale to degrees C.
    var seaWaterTemperature = salinity
      .select('water_temp_0')
      .map(function scaleAndOffset(image) {
        return ee.Image(image).multiply(0.001).add(20)
      })
      .mean()

    const visParams = {
      min: -2.0, // Degrees C
      max: 34.0,
      palette: ['000000', '005aff', '43c8c8', 'fff700', 'ff0000'],
    }

    seaWaterTemperature.getMap(visParams, function (map) {
      resolve(map)
    })
  })
}

const getWaterVelocityMap = (ee) => {
  return new Promise((resolve) => {
    const velocity = ee
      .Image('HYCOM/sea_water_velocity/2014040700')
      .divide(1000)

    const layer = velocity
      .select('velocity_u_0')
      .hypot(velocity.select('velocity_v_0'))

    layer.getMap({ min: 0, max: 1 }, function (map) {
      resolve(map)
    })
  })
}

const initEE = () => {
  return new Promise((resolve) => {
    // if we have a cached instance and its less than 10 minutes old, use it
    if (
      cachedEEInstance.instance != null &&
      cachedEEInstance.date &&
      new Date() - cachedEEInstance.date < 600000
    ) {
      resolve(cachedEEInstance)
      return
    }

    ee.data.authenticateViaPrivateKey(
      privateKey,
      () => {
        ee.initialize(
          null,
          null,
          async () => {
            const landcoverMap = await getLandcoverMap(ee)
            const waterVelocityMap = await getWaterVelocityMap(ee)
            const waterTemperatureMap = await getWaterTemperatureMap(ee)

            cachedEEInstance = {
              date: new Date(),
              landcover: landcoverMap,
              waterVelocity: waterVelocityMap,
              waterTemperature: waterTemperatureMap,
            }

            resolve(cachedEEInstance)
          },
          (e) => console.error('Initialization error: ' + e)
        )
      },
      (e) => console.error('Authentication error: ' + e)
    )
  })
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const tileToLandcover = async (id, tile) => {
  requestInProgress = true
  const googleEE = await initEE()

  const childTiles = tilebelt.getChildren(tile)
  const landcoverMaps = await promiseSeries(childTiles, (t) =>
    downloadTile(googleEE.landcover.urlFormat, t)
  )
  const stitched = await stitchTileImages(landcoverMaps)

  const file = new File([stitched], 'landcover.png')
  const landcover = await pb.collection('landcovers').create({
    original: file,
  })
  await pb.collection('tiles').update(id, { landcover: landcover.id })

  requestInProgress = false
}

const tileToOceanData = async (id, tile) => {
  requestInProgress = true

  const googleEE = await initEE()

  const waterVelocity = await downloadTile(
    googleEE.waterVelocity.urlFormat,
    tile
  )
  const waterTemperature = await downloadTile(
    googleEE.waterTemperature.urlFormat,
    tile
  )
  const depth = await generateElevationImage(tile)

  const oceanData = await pb.collection('oceanData').create({
    water_velocity: new File([waterVelocity], 'water_velocity.png'),
    water_temperature: new File([waterTemperature], 'water_temperature.png'),
    depth: new File([depth], 'depth.png'),
  })
  await pb.collection('tiles').update(id, { oceanData: oceanData.id })

  requestInProgress = false
}

let requestQueue = []
let requestInProgress = false

const queueUpLandCover = async (record) => {
  const tile = [record.x, record.y, record.zoom]

  if (!requestInProgress) {
    await tileToLandcover(record.id, tile)
    while (requestQueue.length) {
      await wait(2500)
      const next = requestQueue.shift()
      await tileToLandcover(next.id, next.tile)
    }
  } else {
    requestQueue.push({ tile, id: record.id })
  }
}

const queueUpOceanData = async (record) => {
  const tile = [record.x, record.y, record.zoom]

  if (!requestInProgress) {
    await tileToOceanData(record.id, tile)
    while (requestQueue.length) {
      await wait(2500)
      const next = requestQueue.shift()
      await tileToOceanData(next.id, next.tile)
    }
  } else {
    requestQueue.push({ tile, id: record.id })
  }
}

pb.collection('tiles').subscribe('*', async ({ action, record }) => {
  if (action == 'create') {
    queueUpLandCover(record)
  }
})

pb.collection('landcovers').subscribe('*', ({ action, record }) => {
  if (action === 'update') {
    if (record.coverage && record.coverage.water > 40) {
      setTimeout(async () => {
        const tile = await pb
          .collection('tiles')
          .getFirstListItem(`landcover="${record.id}"`)
        if (tile) {
          queueUpOceanData(tile)
        }
      }, 1000)
    }
  }
})

const checkForUnpopulatedLandcovers = async () => {
  const response = await pb
    .collection('tiles')
    .getList(1, 100, { filter: 'landcover = null' })

  for (let tile of response.items) {
    queueUpLandCover(tile)
  }
}

setTimeout(() => {
  checkForUnpopulatedLandcovers()
}, 1000)

module.exports = {
  initEE,
}
