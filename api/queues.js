import Bull from 'bull'
import fs from 'fs'
import {
  createFolder,
  minTilesForCoords,
  promiseSeries,
  tileToId,
} from './utils.js'

export const mapboxQueue = new Bull('mapbox-queue')
export const earthEngineQueue = new Bull('earth-engine-queue')
export const landcoverQueue = new Bull('landcover-queue')
export const heightmapQueue = new Bull('heightmap-queue')

export const tileQueue = new Bull('tile-queue')

export const createTileFolder = async (parentPath, tile, index) => {
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

export const createTile = async (coords, zoom) => {
  const tiles = minTilesForCoords(coords, zoom)
  const tileId = tileToId(tiles.flat())
  const path = `./public/tiles/${tileId}`

  if (fs.existsSync(path)) {
    return [tileId, true]
  }

  await createFolder(path)

  console.log('create tiles', tiles)

  await promiseSeries(tiles, (tile, index) =>
    createTileFolder(path, tile, index)
  )

  return [tileId, false]
}

tileQueue.process(async (job, done) => {
  console.log('tileQueue', job.data)
  const { tile, coords } = job.data

  const [tileId, alreadyExists] = await createTile(coords, 13)
  if (alreadyExists) {
    done()
    return
  }
  job.progress(10)

  const mapboxJob = await mapboxQueue.add({
    ...job.data,
    tileId,
  })

  await mapboxJob.finished()
  job.progress(50)

  const landcoverJob = await landcoverQueue.add({
    ...job.data,
    tileId,
  })
  await landcoverJob.finished()

  job.progress(75)

  done()
})
