require('dotenv').config()

const express = require('express')
const fs = require('fs')
const mapbox = require('./mapbox')
const segmenter = require('./segmenter')
const heightmap = require('./heightmap')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/tile', async (req, res) => {
  const { coords } = req.body
  console.log('POST /tile', coords)

  const tileId = await mapbox.getTile(coords)
  const landcoverTiles = await segmenter.getLandcoversForTile(tileId)
  await heightmap.modifyHeightmap(tileId, landcoverTiles)

  //   const file = await writeFile(tile)

  res.send(tileId)
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
