import * as mapbox from './mapbox/index.js'
import * as segmenter from './segmenter.js'
import * as heightmap from './heightmap/index.js'
import cors from 'cors'
import {
  combineLandcoverAndRecolor,
  convertLandcoverToRGBTexture,
} from './landcover.js'
import {
  createGeoTiff,
  getCoverTileData,
  minTilesForCoords,
  promiseSeries,
} from './utils.js'
import tilebelt from '@mapbox/tilebelt'

const getChildrenUntilZoom = (tiles, zoom) => {
  console.log(tiles.length, zoom)
  const children = tiles.map((tile) => tilebelt.getChildren(tile)).flat()

  if (children[0][2] >= zoom) {
    return children
  }

  return getChildrenUntilZoom(children, zoom)
}

export const createArea = async ({ coords, zoom }) => {
  const tiles = getChildrenUntilZoom(minTilesForCoords(coords, zoom), 13)

  let progress = 0
  const total = tiles.length
  await promiseSeries(tiles, async (tile) => {
    console.log(`Creating tile: ${progress++}/${total}`)
    const bbox = tilebelt.tileToBBOX(tile)
    const [minX, minY, maxX, maxY] = bbox
    const inset = 0.01
    const topLeft = [minX + inset, maxY - inset]
    const topRight = [maxX - inset, maxY - inset]
    const bottomRight = [maxX - inset, minY + inset]
    const bottomLeft = [minX + inset, minY + inset]
    const coords = [topLeft, topRight, bottomRight, bottomLeft, topLeft]

    const [tileId, alreadyExists] = await mapbox.createTile(coords, 13)
    if (alreadyExists) {
      return
    }
    await mapbox.getTileData(tileId)
    await combineLandcoverAndRecolor(tileId)
    await convertLandcoverToRGBTexture(tileId)
    await heightmap.modifyHeightmap(tileId)
  })
}
