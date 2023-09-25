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
  normalizeColorsBeforeStitching,
  convertToGrayScale,
} = require('./utils')
const distanceTable = require('./mapbox_distance_table.json')
const googleEarth = require('./google-earth')
const ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN
const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME
const MAPBOX_STYLE_ID = process.env.MAPBOX_STYLE_ID

const getMetersPerPixel = (zoom, latitude) => {
  // round for example 57.7 to 60
  const roundedLatitude = Math.round(latitude / 10) * 10
  return distanceTable[zoom][roundedLatitude]
}

const baseUrl = 'https://api.mapbox.com/v4'
const downloadTile = async (tile, type = 'mapbox.terrain-rgb') => {
  const [x, y, zoom] = tile
  let url = `${baseUrl}/${type}/${zoom}/${x}/${y}@2x.pngraw?access_token=${ACCESS_TOKEN}`
  if (type === 'landcover-grass') {
    url = `https://api.mapbox.com/styles/v1/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}/tiles/${zoom}/${x}/${y}?access_token=${ACCESS_TOKEN}&fresh=true`
  }

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  })

  return response.data
}

const getChildrenAndStitch = async (
  parentPath,
  tile,
  index,
  bottom = false
) => {
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
      getChildrenAndStitch(path, childTile, children.indexOf(childTile), true)
    )

    fs.writeFileSync(
      `${path}/tile.json`,
      JSON.stringify({
        tile,
        index,
      })
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
      `${path}/landcover_grass.png`,
    ]
  } else {
    // create folder
    await createFolder(path)
  }

  const rgbHeightMap = await downloadTile(tile, 'mapbox.terrain-rgb')
  await writeFile(rgbHeightMap, `${path}/terrain-rgb.png`)
  const rgbPixelData = await getPixelDataFromFile(`${path}/terrain-rgb.png`)
  const { heightMapData, minHeight, maxHeight } =
    convertPngToHeightMap(rgbPixelData)
  await writePixelsToPng(heightMapData, 512, 512, `${path}/heightmap.png`)
  const landcoverGrassData = await downloadTile(tile, 'landcover-grass')
  await writeFile(landcoverGrassData, `${path}/landcover_grass.png`)

  const children = tilebelt.getChildren(tile)

  const childrenFiles = await promiseSeries(children, (childTile) =>
    getChildrenAndStitch(path, childTile, children.indexOf(childTile))
  )

  await stitchTileImages(childrenFiles, `${path}/stitched.png`)
  fs.writeFileSync(
    `${path}/tile.json`,
    JSON.stringify({
      tile,
      index,
      minHeight,
      maxHeight,
    })
  )

  return [
    `${path}/heightmap.png`,
    `${path}/stitched.png`,
    `${path}/landcover_grass.png`,
  ]
}

module.exports = {
  tileToBBOX: (tile) => tilebelt.tileToBBOX(tile),
  getMetersPerPixel,
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
    const landcoverMaps = await promiseSeries(tiles, (tile) =>
      googleEarth.downloadTile(tile)
    )
    const heightMaps = imagePaths.map((imagePath) => imagePath[0])
    const rasterMaps = imagePaths.map((imagePath) => imagePath[1])
    // const landcoverMaps = imagePaths.map((imagePath) => imagePath[2])

    // fix heightmaps before stitching
    await Promise.all(
      heightMaps.map((p) =>
        convertToGrayScale(p, p.replace('.png', '_grayscale.jpg'))
      )
    )

    const updatedHeightmapPaths = await normalizeColorsBeforeStitching(
      heightMaps.map((p) => p.replace('.png', '_grayscale.jpg'))
    )

    // stitch all images
    await stitchTileImages(updatedHeightmapPaths, `${path}/heightmap.png`)
    await stitchTileImages(rasterMaps, `${path}/sattelite.png`)
    await stitchTileImages(landcoverMaps, `${path}/landcover.png`)

    return tileId
  },
}
