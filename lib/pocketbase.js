import PocketBase from 'pocketbase'
import tilebelt from '@mapbox/tilebelt'
import eventsource from 'eventsource'
import { minTilesForCoords } from './utils.js'

if (typeof process !== 'undefined' && process.release.name === 'node') {
  global.EventSource = eventsource
}
const PB_URL = 'http://localhost:8090'
const pb = new PocketBase(PB_URL)
pb.autoCancellation(false)

const emptyLandcover = () => ({
  id: '-',
  url: `${import.meta.env.VITE_URL}/images/loading.png`,
  coverage: {},
})

const mapLandcover = (landcover) => {
  return landcover
    ? {
        id: landcover.id,
        url: convertFileToUrl(
          landcover.collectionId,
          landcover.id,
          landcover.color
        ),
        coverage: landcover.coverage,
      }
    : emptyLandcover()
}

const mapTile = (tile) => {
  const landcover = tile.expand?.landcover
  const heightmap = tile.expand?.heightmap
  const center = [
    (tile.bbox[0] + tile.bbox[2]) / 2,
    (tile.bbox[1] + tile.bbox[3]) / 2,
  ]
  return {
    id: tile.id,
    bbox: tile.bbox,
    center,
    landcover: mapLandcover(landcover),
    heightmap: heightmap
      ? {
          id: heightmap.id,
          url: convertFileToUrl(
            heightmap.collectionId,
            heightmap.id,
            heightmap.heightmap
          ),
        }
      : {},
    satellite: convertFileToUrl(tile.collectionId, tile.id, tile.satellite),
  }
}

export const ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
}

export const convertFileToUrl = (collectionId, recordId, filename) =>
  `${PB_URL}/api/files/${collectionId}/${recordId}/${filename}`

export const file = (collectionId, recordId, filename) =>
  `${PB_URL}/api/files/${collectionId}/${recordId}/${filename}`

export const getTiles = () =>
  pb
    .collection('tiles')
    .getFullList({
      expand: 'landcover,heightmap',
    })
    .then((tiles) => tiles.map(mapTile))

export const createTiles = ({ coords, zoom }) => {
  const tiles = minTilesForCoords(coords, zoom)

  for (const tile of tiles) {
    const bbox = tilebelt.tileToBBOX(tile)
    pb.collection('tiles').create({
      x: tile[0],
      y: tile[1],
      zoom: tile[2],
      bbox,
    })
  }
}

export const createLandcover = async (tileId, file) => {
  const { id } = await pb.collection('landcovers').create({
    original: file,
  })
  await updateTile(tileId, { landcover: id })
}

export const updateLandCover = async (id, file) => {
  await pb.collection('landcovers').update(id, {
    color: file,
  })
  // await updateTile(tileId, { landcover: id })
}

export const createHeightMap = async (tileId, file) => {
  const { id } = await pb.collection('heightmaps').create({
    original: file,
  })
  await updateTile(tileId, { heightmap: id })
}

export const updateTile = (id, data) => pb.collection('tiles').update(id, data)

export const subscribe = (collection, event, callback, remap = false) => {
  if (!pb) return
  return pb.collection(collection).subscribe(
    event,
    (e) => {
      let record = e.record
      if (remap) {
        switch (collection) {
          case 'tiles':
            record = mapTile(record)
            break
          case 'landcovers':
            record = mapLandcover(record)
            break
          default:
            break
        }
      }
      callback({
        action: e.action,
        record,
      })
    },
    { expand: 'landcover,heightmap' }
  )
}

export const unsubscribe = (collection, event) => {
  if (!pb) return
  return pb.collection(collection).unsubscribe([event])
}
