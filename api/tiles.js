import fs from 'fs'
import { getCoverTileData } from './utils.js'

let cachedTiles = null
let lastCacheRefresh = 0

export const getAllTiles = () => {
  if (cachedTiles && Date.now() - lastCacheRefresh < 1000 * 60 * 5) {
    return cachedTiles
  }
  const tileIds = fs
    .readdirSync('./public/tiles', { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name)

  const tiles = tileIds.map((id) => {
    const tileData = getCoverTileData(id)
    // const coverageData =

    // check if edited versions exist
    const editedLandcoverFile = `./public/tiles/${id}/landcover_colors_edited.png`
    let landcoverFile = `./public/tiles/${id}/landcover_colors.png`
    let landcoverFileSmall = `./public/tiles/${id}/landcover_colors_100.png`

    if (fs.existsSync(editedLandcoverFile)) {
      landcoverFile = editedLandcoverFile
      landcoverFileSmall = editedLandcoverFile.replace('.png', '_100.png')
    }

    const heightmapFile = `./public/tiles/${id}/heightmap_final.png`
    const textureFile = `./public/tiles/${id}/landcover_texture.png`
    const textureFileSmall = `./public/tiles/${id}/landcover_texture_100.png`
    const geoTiffFile = `./public/tiles/${id}/landcover_texture.tif`
    const geoTiffFileSmall = `./public/tiles/${id}/landcover_texture_100.tif`
    const satelliteFile = `./public/tiles/${id}/sattelite.png`

    // read coverage data

    let coverage = {}
    try {
      coverage = JSON.parse(
        fs.readFileSync(`./public/tiles/${id}/coverage.json`, 'utf8')
      )
    } catch (_) {}

    return {
      id,
      landcover: fs.existsSync(landcoverFile)
        ? landcoverFile.replace('./public', '')
        : null,
      landcoverSmall: fs.existsSync(landcoverFileSmall)
        ? landcoverFileSmall.replace('./public', '')
        : null,
      heightmap: fs.existsSync(heightmapFile)
        ? heightmapFile.replace('./public', '')
        : null,
      satellite: fs.existsSync(satelliteFile)
        ? satelliteFile.replace('./public', '')
        : null,
      texture: fs.existsSync(textureFile)
        ? textureFile.replace('./public', '')
        : null,
      textureSmall: fs.existsSync(textureFileSmall)
        ? textureFileSmall.replace('./public', '')
        : null,
      geoTiff: fs.existsSync(geoTiffFile)
        ? geoTiffFile.replace('./public', '')
        : null,
      geoTiffSmall: fs.existsSync(geoTiffFileSmall)
        ? geoTiffFileSmall.replace('./public', '')
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
    console.log(x, y, bounds)
    // bounds is [lat1, lng1, lat2, lng2]
    return x > bounds[0] && x < bounds[2] && y > bounds[1] && y < bounds[3]
  })
}

export const getTiles = (page, offset) => {
  const tiles = getAllTiles()

  return tiles.slice(page * offset, page * offset + offset)
}
