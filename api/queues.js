import Bull from 'bull'
import fs from 'fs'
import {
  createFolder,
  minTilesForCoords,
  promiseSeries,
  tileToId,
} from './utils.js'
import tilebelt from '@mapbox/tilebelt'

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
      size: 512,
    })
  )
}

export const createDetailedTile = async (tiles) => {
  const tileId = tileToId(tiles.flat())
  const path = `./public/tiles/${tileId}`

  if (fs.existsSync(path)) {
    return [tileId, tiles, true]
  }
  await createFolder(path)
  fs.writeFileSync(
    `${path}/tile.json`,
    JSON.stringify({
      size: 1024,
    })
  )

  await promiseSeries(tiles, (tile, index) =>
    createTileFolder(path, tile, index)
  )

  return [tileId, tiles, false]
}

export const createTile = async (tile, tiles) => {
  if (tiles) return createDetailedTile(tiles)

  const tileId = tileToId(tile)
  const path = `./public/tiles/${tileId}`

  if (fs.existsSync(path)) {
    const childTiles = tilebelt.getChildren(tile)
    return [tileId, childTiles, true]
  }

  await createTileFolder('./public/tiles/', tile, 0)

  const childTiles = tilebelt.getChildren(tile)
  await promiseSeries(childTiles, (childTile, index) =>
    createTileFolder(path, childTile, index)
  )

  return [tileId, childTiles, false]
}

export const updateTile = async (tileId) => {
  const landcoverJob = await landcoverQueue.add({
    tileId,
  })
  await landcoverJob.finished()
  const heightmapJob = await heightmapQueue.add({
    tileId,
  })
  await heightmapJob.finished()
}

tileQueue.process(16, async (job, done) => {
  console.log('tileQueue', job.data)
  const { tile, tiles, createHeightMap, createLandcover } = job.data

  let [tileId, childTiles, alreadyExists] = await createTile(tile, tiles)
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
      tiles,
    })

    await mapboxJob.finished()
    job.progress(30)

    if (createLandcover) {
      const earthEngineJob = await earthEngineQueue.add({
        path,
        tiles: childTiles,
      })
      await earthEngineJob.finished()
      job.progress(50)

      const landcoverJob = await landcoverQueue.add({
        ...job.data,
        tileId,
      })
      await landcoverJob.finished()
    }
    job.progress(75)

    if (createHeightMap) {
      const heightmapJob = await heightmapQueue.add({
        ...job.data,
        tileId,
      })
      await heightmapJob.finished()
    }
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
