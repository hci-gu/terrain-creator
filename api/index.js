import { config } from 'dotenv'
config()

import express from 'express'
import bodyParser from 'body-parser'
import fs from 'fs'
import * as googleEarthEngine from './google-earth-engine/index.js'
import * as tiles from './tiles.js'
import cors from 'cors'
import { createArea } from './area.js'
import { updateTile } from './queues.js'
googleEarthEngine.initEE()

const app = express()

app.use(cors())
app.use(bodyParser({ limit: '25mb' }))
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/tiles', (req, res) => {
  const { bounds } = req.query
  const coords = bounds ? bounds.split(',').map((c) => parseFloat(c)) : []

  if (coords.every((b) => b)) {
    return res.send(tiles.getTilesForBounds(coords))
  }

  res.send(tiles.getAllTiles())
})

app.get('/tile/:id', (req, res) => {
  const { id } = req.params
  const tile = tiles.getTile(id)
  res.send(tile)
})

app.delete('/tile/:id/landcover', async (req, res) => {
  const { id } = req.params

  try {
    fs.unlinkSync(`./public/tiles/${id}/landcover_colors_edited.png`)
  } catch (e) {
    console.log('error deleting file', e)
  }

  res.send('OK')
})

app.post('/area', async (req, res) => {
  const {
    coords,
    zoom,
    createHeightMap = true,
    createLandcover = true,
  } = req.body
  console.log('POST /area', coords, zoom, createHeightMap, createLandcover)

  createArea({ coords, zoom, createHeightMap, createLandcover })
  tiles.clearTiles()
  res.send('OK')
})

// route to accept posted image
app.post('/tile/:id/landcover', async (req, res) => {
  const { id } = req.params
  console.log('POST /tile/:id/landcover', id)
  const image = req.body.image
  const base64Data = image.replace(/^data:image\/png;base64,/, '')

  // Convert the base64 string back to binary data
  const binaryData = Buffer.from(base64Data, 'base64')

  const outputPath = `./public/tiles/${id}/landcover_colors_edited.png`
  fs.writeFileSync(outputPath, binaryData, 'binary')

  updateTile(id)
  res.send('Image saved successfully')
})

app.listen(7777, () => {
  console.log('Example app listening on port 7777!')
})
