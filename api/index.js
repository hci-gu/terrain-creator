require('dotenv').config()

const express = require('express')
const fs = require('fs')
const mapbox = require('./mapbox')
const segmenter = require('./segmenter')
const heightmap = require('./heightmap')
const cors = require('cors')
const { combineLandcoverAndRecolor } = require('./landcover')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const getTile = (path, id) => {
  let tileInfo = {}
  if (fs.existsSync(`${path}/${id}/tile.json`)) {
    tileInfo = JSON.parse(fs.readFileSync(`${path}/${id}/tile.json`))
    tileInfo = {
      ...tileInfo,
      bbox: mapbox.tileToBBOX(tileInfo.tile),
    }
  }

  const childTiles = fs
    .readdirSync(`${path}/${id}`, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())

  if (childTiles.length === 0) {
    return {
      id,
      ...tileInfo,
    }
  }

  return {
    id,
    ...tileInfo,
    tiles: childTiles.map((dir) => getTile(`${path}/${id}`, dir.name)),
  }
}

app.get('/tiles', (req, res) => {
  // get all folders in path
  const tileIds = fs
    .readdirSync('./public/tiles', { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name)

  const tiles = tileIds.map((id) => {
    const tileFolders = fs
      .readdirSync(`./public/tiles/${id}`, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())

    return {
      id,
      tiles: tileFolders.map((dir) =>
        getTile(`./public/tiles/${id}`, dir.name)
      ),
    }
  })

  res.send(tiles)
})

app.post('/tile', async (req, res) => {
  const { coords } = req.body
  console.log('POST /tile', coords)

  const tileId = await mapbox.getTile(coords)
  const landcoverTiles = await segmenter.getLandcoversForTile(tileId)
  await combineLandcoverAndRecolor(landcoverTiles)
  await heightmap.modifyHeightmap(tileId, landcoverTiles)

  //   const file = await writeFile(tile)

  res.send(tileId)
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
