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
  updateTileProgress,
  resizeAndConvert,
} = require('./utils')
const distanceTable = require('./mapbox_distance_table.json')
const googleEarthEngine = require('./google-earth-engine')
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

createTileFolder = async (parentPath, tile, index) => {
  const tileId = tileToId(tile)
  const path = `${parentPath}/${tileId}`

  await createFolder(path)

  fs.writeFileSync(
    `${path}/tile.json`,
    JSON.stringify({
      tile,
      index,
    })
  )
}

const getTilesFromFolder = (tileId) => {
  const path = `./public/tiles/${tileId}`
  const folders = fs
    .readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  return folders
    .map((folder) => {
      return JSON.parse(fs.readFileSync(`${path}/${folder}/tile.json`))
    })
    .sort((a, b) => a.index - b.index)
    .map((tile) => tile.tile)
}

module.exports = {
  tileToBBOX: (tile) => tilebelt.tileToBBOX(tile),
  getMetersPerPixel,
  createTile: async (coords, zoom) => {
    const tiles = minTilesForCoords(coords, zoom)
    const tileId = tileToId(tiles.flat())
    const path = `./public/tiles/${tileId}`

    if (fs.existsSync(path)) {
      return [tileId, true]
    }

    await createFolder(path)
    updateTileProgress(tileId, 0)

    await promiseSeries(tiles, (tile, index) =>
      createTileFolder(path, tile, index)
    )

    return [tileId, false]
  },
  getTileData: async (tileId) => {
    const path = `./public/tiles/${tileId}`
    const tiles = getTilesFromFolder(tileId)
    console.log('tiles', tiles)

    const imagePaths = await promiseSeries(tiles, (tile, index) =>
      getTile(path, tile, index)
    )
    const googleEEUrl = await googleEarthEngine.initEE()
    const landcoverMaps = await promiseSeries(tiles, (tile) =>
      googleEarthEngine.downloadTile(googleEEUrl, tile)
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

    if (imagePaths.length === 1) {
      fs.copyFileSync(updatedHeightmapPaths[0], `${path}/heightmap.png`)
      await resizeAndConvert(`${path}/heightmap.png`, 1024)
      fs.copyFileSync(rasterMaps[0], `${path}/sattelite.png`)
      await writeFile(landcoverMaps[0], `${path}/landcover.png`)
      await resizeAndConvert(`${path}/landcover.png`, 512)
      return tileId
    }

    // stitch all images
    await stitchTileImages(updatedHeightmapPaths, `${path}/heightmap.png`)
    await stitchTileImages(rasterMaps, `${path}/sattelite.png`)
    await stitchTileImages(landcoverMaps, `${path}/landcover.png`)

    return tileId
  },
}
