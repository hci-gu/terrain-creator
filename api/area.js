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

export const createArea = async ({
  coords,
  zoom,
  createHeightMap,
  createLandcover,
}) => {
  const tiles = minTilesForCoords(coords, zoom)
  if (zoom == 13) {
    tileQueue.add({
      tiles,
      zoom,
      createHeightMap,
      createLandcover,
    })
  } else {
    for (const tile of tiles) {
      tileQueue.add({
        tile,
        zoom,
        createHeightMap,
        createLandcover,
      })
    }
  }
}
