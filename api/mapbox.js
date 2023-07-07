const fs = require('fs')
const axios = require('axios')
const turf = require('@turf/turf')
const tilebelt = require('@mapbox/tilebelt')
const cover = require('@mapbox/tile-cover')
const sha1 = require('sha1')
const uuid = require('uuid')
const {
  convertPngToHeightMap,
  writePixelsToPng,
  writeFile,
  getPixelDataFromFile,
  createFolder,
  stitchTileImages,
  promiseSeries,
} = require('./utils')
const ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

const baseUrl = 'https://api.mapbox.com/v4'
const downloadTile = async (tile, type = 'mapbox.terrain-rgb') => {
  const [x, y, zoom] = tile
  const url = `${baseUrl}/${type}/${zoom}/${x}/${y}@2x.pngraw?access_token=${ACCESS_TOKEN}`

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  })

  return response.data
}

const getChildrenAndStitch = async (path, tile, bottom = false) => {
  console.log('getChildrenAndStitch', tile)
  const children = tilebelt.getChildren(tile)

  const stitchedPath = `${path}/${tile.join('_')}_stitched.png`
  if (bottom) {
    const childrenFiles = await promiseSeries(children, (childTile) =>
      downloadTile(childTile, 'mapbox.satellite')
    )
    // save all children files
    const filePaths = await Promise.all(
      childrenFiles.map(async (childFile, index) => {
        const filePath = `${path}/${uuid.v4()}.png`
        await writeFile(childFile, filePath)
        return filePath
      })
    )
    await stitchTileImages(filePaths, stitchedPath)
  } else {
    const childrenFilePaths = await promiseSeries(children, (childTile) =>
      getChildrenAndStitch(path, childTile, true)
    )

    await stitchTileImages(childrenFilePaths, stitchedPath)
  }

  return stitchedPath
}

const getTile = async (tile) => {
  const tileId = sha1(tile.join('_'))
  const path = `./public/tiles/${tileId}`

  if (fs.existsSync(path)) {
    console.log('Tile already exists', tileId)
    return [`${path}/heightmap.png`, `${path}/stitched.png`]
  }

  const rgbHeightMap = await downloadTile(tile, 'mapbox.terrain-rgb')
  await writeFile(rgbHeightMap, `${path}/terrain-rgb.png`)
  const rgbPixelData = await getPixelDataFromFile(`${path}/terrain-rgb.png`)
  const heightmapData = convertPngToHeightMap(rgbPixelData)
  await writePixelsToPng(heightmapData, 512, 512, `${path}/heightmap.png`)

  const children = tilebelt.getChildren(tile)

  const childrenFiles = await promiseSeries(children, (childTile) =>
    getChildrenAndStitch(path, childTile)
  )

  await stitchTileImages(childrenFiles, `${path}/stitched.png`)

  return [`${path}/heightmap.png`, `${path}/stitched.png`]
}

const tileForCoords = (coords) => {
  var line = turf.lineString(coords)
  var bbox = turf.bbox(line)
  const tile = tilebelt.bboxToTile(bbox)

  return tile
}

const minTilesForCoords = (coords) => {
  var line = turf.lineString(coords)
  var bbox = turf.bbox(line)
  const bboxPolygon = turf.bboxPolygon(bbox)

  const tiles = cover.tiles(bboxPolygon.geometry, {
    min_zoom: 10,
    max_zoom: 14,
  })
  // tile is [x, y, zoom]
  // sort the tiles by x and y
  tiles.sort((a, b) => {
    if (a[1] === b[1]) {
      return a[0] - b[0]
    }
    return a[1] - b[1]
  })
  console.log('sorted', tiles)

  // flip second part of array
  const half = Math.ceil(tiles.length / 2)
  const top = tiles.slice(0, half)
  const bottom = tiles.slice(half, tiles.length).reverse()

  return [...top, ...bottom]
}

module.exports = {
  getTile: async (coords) => {
    const tileId = sha1(coords.join('_'))
    const path = `./public/tiles/${tileId}`

    const tiles = minTilesForCoords(coords)

    const imagePaths = await promiseSeries(tiles, getTile)
    const heightMaps = imagePaths.map((imagePath) => imagePath[0])
    const rasterMaps = imagePaths.map((imagePath) => imagePath[1])

    await stitchTileImages(heightMaps, `${path}_heightmap.png`)
    await stitchTileImages(rasterMaps, `${path}_sattelite.png`)

    console.log('ALL DONE!')
  },
}
