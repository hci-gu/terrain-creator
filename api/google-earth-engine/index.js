import axios from 'axios'
import ee from '@google/earthengine'
import privateKey from './service_account.json' assert { type: 'json' }
import tilebelt from '@mapbox/tilebelt'
import * as pocketbase from '../../lib/pocketbase.js'
import { promiseSeries, stitchTileImages } from '../utils.js'

export const downloadTile = async (url, tile) => {
  const [x, y, zoom] = tile
  let requestUrl = url.replace('{x}', x).replace('{y}', y).replace('{z}', zoom)
  console.log('GOOGLE_EARTH_URL', requestUrl)

  const response = await axios.get(requestUrl, {
    responseType: 'arraybuffer',
  })

  return response.data
}

let cachedEEInstance = {
  date: null,
  instance: null,
}
export const initEE = () => {
  return new Promise((resolve) => {
    // if we have a cached instance and its less than 10 minutes old, use it
    if (
      cachedEEInstance.instance != null &&
      cachedEEInstance.date &&
      new Date() - cachedEEInstance.date < 600000
    ) {
      resolve(cachedEEInstance.instance.urlFormat)
      return
    }

    ee.data.authenticateViaPrivateKey(
      privateKey,
      () => {
        ee.initialize(
          null,
          null,
          () => {
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
              cachedEEInstance = {
                date: new Date(),
                instance: map,
              }
              resolve(map.urlFormat)
            })
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
  const googleEEUrl = await initEE()

  const childTiles = tilebelt.getChildren(tile)
  const landcoverMaps = await promiseSeries(childTiles, (t) =>
    downloadTile(googleEEUrl, t)
  )
  const stitched = await stitchTileImages(landcoverMaps)

  const file = new File([stitched], 'landcover.png')
  await pocketbase.createLandcover(id, file)
  requestInProgress = false
}

let requestQueue = []
let requestInProgress = false

pocketbase.subscribe('tiles', '*', async ({ action, record }) => {
  if (action == pocketbase.ACTIONS.CREATE) {
    const tile = [record.x, record.y, record.zoom]
    console.log('Create tile', tile)

    if (!requestInProgress) {
      console.log('go ahead')
      await tileToLandcover(record.id, tile)
      console.log('done, check queue')
      while (requestQueue.length) {
        console.log('run from queue')
        await wait(2500)
        const next = requestQueue.shift()
        await tileToLandcover(next.id, next.tile)
      }
      console.log('queue drained')
    } else {
      console.log('push to queue')
      requestQueue.push({ tile, id: record.id })
    }
  }
})
