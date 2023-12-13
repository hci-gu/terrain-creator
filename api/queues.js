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
    return [tileId, tiles, true]
  }

  await createFolder(path)

  console.log('create tiles', tiles)

  await promiseSeries(tiles, (tile, index) =>
    createTileFolder(path, tile, index)
  )

  return [tileId, tiles, false]
}

tileQueue.process(16, async (job, done) => {
  console.log('tileQueue', job.data)
  const { tile, zoom, coords } = job.data

  const [tileId, tiles, alreadyExists] = await createTile(coords, 13)
  if (alreadyExists) {
    done()
    return
  }
  const path = `./public/tiles/${tileId}`

  job.progress(10)

  try {
    const mapboxJob = await mapboxQueue.add({
      ...job.data,
      tileId,
    })

    await mapboxJob.finished()
    job.progress(30)

    const earthEngineJob = await earthEngineQueue.add({
      path,
      tiles,
    })
    await earthEngineJob.finished()
    job.progress(50)

    const landcoverJob = await landcoverQueue.add({
      ...job.data,
      tileId,
    })
    await landcoverJob.finished()
    job.progress(75)

    const heightmapJob = await heightmapQueue.add({
      ...job.data,
      tileId,
    })
    await heightmapJob.finished()
    job.progress(100)

    done()
  } catch (e) {
    console.log('tileQueue.progress failed', e)
    done(e)
  }
})

tileQueue.on('failed', (job, err) => {
  console.log('tileQueue failed', job.data, err)

  const { tile } = job.data
  const tileId = tileToId(tile)
  const path = `./public/tiles/${tileId}`
  console.log('delete', path)
  fs.rmdirSync(path, { recursive: true })
  console.log('deleted')
})
