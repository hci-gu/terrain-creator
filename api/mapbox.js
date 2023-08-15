const fs = require('fs')
const axios = require('axios')
const tilebelt = require('@mapbox/tilebelt')
const uuid = require('uuid')
const {
  convertPngToHeightMap,
  writePixelsToPng,
  writeFile,
  getPixelDataFromFile,
  createFolder,
  stitchTileImages,
  promiseSeries,
  tileToId,
  minTilesForCoords,
  getEdgePixels,
  reducePixelValue,
} = require('./utils')
const ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN
const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME
const MAPBOX_STYLE_ID = process.env.MAPBOX_STYLE_ID

const baseUrl = 'https://api.mapbox.com/v4'
const downloadTile = async (tile, type = 'mapbox.terrain-rgb') => {
  const [x, y, zoom] = tile
  const url = `${baseUrl}/${type}/${zoom}/${x}/${y}@2x.pngraw?access_token=${ACCESS_TOKEN}`

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  })

  return response.data
}

const downloadLandcoverTile = async (tile) => {
  const [x, y, zoom] = tile
  const url = `https://api.mapbox.com/styles/v1/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}/tiles/${zoom}/${x}/${y}?access_token=${ACCESS_TOKEN}`

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  })

  return response.data
}

const getChildrenAndStitch = async (parentPath, tile, bottom = false) => {
  const path = `${parentPath}/${tileToId(tile)}`
  await createFolder(path)

  const children = tilebelt.getChildren(tile)

  const stitchedPath = `${path}/stitched.png`
  if (bottom) {
    const childrenFiles = await promiseSeries(children, (childTile) =>
      downloadTile(childTile, 'mapbox.satellite')
    )
    // save all children files
    const filePaths = await Promise.all(
      childrenFiles.map(async (childFile, index) => {
        const filePath = `${path}/${uuid.v4()}.png`
        await writeFile(childFile, filePath)
        fs.writeFileSync(
          `${path}/tile.json`,
          JSON.stringify({
            tile,
            index,
          })
        )
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

const getTile = async (folder, tile, index) => {
  const tileId = tileToId(tile)
  const path = `${folder}/${tileId}`

  if (fs.existsSync(path)) {
    return [
      `${path}/heightmap.png`,
      `${path}/stitched.png`,
      `${path}/island_mask.png`,
    ]
  } else {
    // create folder
    await createFolder(path)
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
  fs.writeFileSync(
    `${path}/tile.json`,
    JSON.stringify({
      tile,
      index,
    })
  )

  return [
    `${path}/heightmap.png`,
    `${path}/stitched.png`,
    `${path}/island_mask.png`,
  ]
}

const compareImageHeightsAndReduce = async (image1, image2, side1, side2) => {
  const edge1 = await getEdgePixels(image1, side1)
  const edge2 = await getEdgePixels(image2, side2)
  const avgEdge1 = edge1.reduce((a, b) => a + b, 0) / edge1.length
  const avgEdge2 = edge2.reduce((a, b) => a + b, 0) / edge2.length

  let diffs = []
  for (let i = 0; i < edge1.length; i++) {
    const diff = edge1[i] - edge2[i]
    diffs.push(diff)
  }
  const averageDiff = Math.abs(diffs.reduce((a, b) => a + b, 0) / diffs.length)

  let imageToReduce = avgEdge1 > avgEdge2 ? image1 : image2

  await reducePixelValue(imageToReduce, averageDiff)
}

module.exports = {
  getTile: async (coords) => {
    const tiles = minTilesForCoords(coords)
    const tileId = tileToId(tiles.flat())
    const path = `./public/tiles/${tileId}`

    if (fs.existsSync(path)) {
      return tileId
    }

    await createFolder(path)

    const imagePaths = await promiseSeries(tiles, (tile, index) =>
      getTile(path, tile, index)
    )
    const heightMaps = imagePaths.map((imagePath) => imagePath[0])
    const rasterMaps = imagePaths.map((imagePath) => imagePath[1])

    await compareImageHeightsAndReduce(
      heightMaps[0],
      heightMaps[1],
      'right',
      'left'
    )

    await compareImageHeightsAndReduce(
      heightMaps[2],
      heightMaps[3],
      'right',
      'left'
    )

    // stich images
    await stitchTileImages(heightMaps, `${path}/heightmap.png`)
    await stitchTileImages(rasterMaps, `${path}/sattelite.png`)

    return tileId
  },
}
