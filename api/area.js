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
import { tileQueue } from './queues.js'

const getChildrenUntilZoom = (tiles, zoom) => {
  const children = tiles.map((tile) => tilebelt.getChildren(tile)).flat()

  if (children[0][2] >= zoom) {
    return children
  }

  return getChildrenUntilZoom(children, zoom)
}

export const createArea = async ({
  coords,
  zoom,
  createHeightMap,
  createLandcover,
}) => {
  const tiles = getChildrenUntilZoom(minTilesForCoords(coords, zoom), 13)

  for (const tile of tiles) {
    const bbox = tilebelt.tileToBBOX(tile)
    const [minX, minY, maxX, maxY] = bbox
    const inset = 0.01
    const topLeft = [minX + inset, maxY - inset]
    const topRight = [maxX - inset, maxY - inset]
    const bottomRight = [maxX - inset, minY + inset]
    const bottomLeft = [minX + inset, minY + inset]
    const coords = [topLeft, topRight, bottomRight, bottomLeft, topLeft]

    tileQueue.add({
      tile,
      coords,
      zoom,
      createHeightMap,
      createLandcover,
    })
  }
}
