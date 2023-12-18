import fs from 'fs'
import { getCoverTileData } from './utils.js'
import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

console.log('__dirname', __dirname)

let cachedTiles = null
let lastCacheRefresh = 0
const publicFolder = `${__dirname.replace('/api', '')}public`
const tilesFolder = `${publicFolder}/tiles`

export const getAllTiles = () => {
  if (cachedTiles && Date.now() - lastCacheRefresh < 1000 * 60 * 5) {
    return cachedTiles
  }
  const tileIds = fs
    .readdirSync(tilesFolder, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name)

  const tiles = tileIds.map((id) => {
    const tileData = getCoverTileData(id)
    // const coverageData =

    // check if edited versions exist
    const editedLandcoverFile = `${tilesFolder}/${id}/landcover_colors_edited.png`
    let landcoverFile = `${tilesFolder}/${id}/landcover_colors.png`
    let landcoverFileSmall = `${tilesFolder}/${id}/landcover_colors_100.png`

    if (fs.existsSync(editedLandcoverFile)) {
      landcoverFile = editedLandcoverFile
      landcoverFileSmall = editedLandcoverFile.replace('.png', '_100.png')
    }

    const heightmapFile = `${tilesFolder}/${id}/heightmap_final.png`
    const textureFile = `${tilesFolder}/${id}/landcover_texture.png`
    const textureFileSmall = `${tilesFolder}/${id}/landcover_texture_100.png`
    const geoTiffFile = `${tilesFolder}/${id}/landcover_texture.tif`
    const geoTiffFileSmall = `${tilesFolder}/${id}/landcover_texture_100.tif`
    const satelliteFile = `${tilesFolder}/${id}/sattelite.png`

    // read coverage data

    let coverage = {}
    try {
      coverage = JSON.parse(
        fs.readFileSync(`${tilesFolder}/${id}/coverage.json`, 'utf8')
      )
    } catch (_) {}

    return {
      id,
      landcover: fs.existsSync(landcoverFile)
        ? landcoverFile.replace(publicFolder, '')
        : null,
      landcoverSmall: fs.existsSync(landcoverFileSmall)
        ? landcoverFileSmall.replace(publicFolder, '')
        : null,
      heightmap: fs.existsSync(heightmapFile)
        ? heightmapFile.replace(publicFolder, '')
        : null,
      satellite: fs.existsSync(satelliteFile)
        ? satelliteFile.replace(publicFolder, '')
        : null,
      texture: fs.existsSync(textureFile)
        ? textureFile.replace(publicFolder, '')
        : null,
      textureSmall: fs.existsSync(textureFileSmall)
        ? textureFileSmall.replace(publicFolder, '')
        : null,
      geoTiff: fs.existsSync(geoTiffFile)
        ? geoTiffFile.replace(publicFolder, '')
        : null,
      geoTiffSmall: fs.existsSync(geoTiffFileSmall)
        ? geoTiffFileSmall.replace(publicFolder, '')
        : null,
      coverage,
      ...tileData,
    }
  })

  cachedTiles = tiles
  lastCacheRefresh = Date.now()

  return tiles
}

export const getTilesForBounds = (bounds) => {
  const tiles = getAllTiles()

  return tiles.filter((tile) => {
    const [y, x] = tile.center
    // bounds is [lat1, lng1, lat2, lng2]
    return x > bounds[0] && x < bounds[2] && y > bounds[1] && y < bounds[3]
  })
}

export const getTiles = (page, offset) => {
  const tiles = getAllTiles()

  return tiles.slice(page * offset, page * offset + offset)
}

export const getTile = (id) => {
  const tiles = getAllTiles()

  return tiles.find((tile) => tile.id === id)
}
