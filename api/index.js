import { config } from 'dotenv'
config()

import express from 'express'
import bodyParser from 'body-parser'
import fs from 'fs'
import * as mapbox from './mapbox/index.js'
import * as segmenter from './segmenter.js'
import * as heightmap from './heightmap/index.js'
import cors from 'cors'
import {
  combineLandcoverAndRecolor,
  convertLandcoverToRGBTexture,
} from './landcover.js'
import { getCoverTileData } from './utils.js'
import { createArea } from './area.js'

const app = express()

app.use(cors())
app.use(bodyParser({ limit: '10mb' }))
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/tiles', (req, res) => {
  // get all folders in path
  const tileIds = fs
    .readdirSync('./public/tiles', { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name)

  const tiles = tileIds.map((id) => {
    const tileData = getCoverTileData(id)
    // const coverageData =

    // check if edited versions exist
    const editedLandcoverFile = `./public/tiles/${id}/landcover_colors_edited.png`
    let landcoverFile = `./public/tiles/${id}/landcover_colors.png`
    let landcoverFileSmall = `./public/tiles/${id}/landcover_colors_100.png`

    if (fs.existsSync(editedLandcoverFile)) {
      landcoverFile = editedLandcoverFile
      landcoverFileSmall = editedLandcoverFile.replace('.png', '_100.png')
    }

    const heightmapFile = `./public/tiles/${id}/heightmap_final.png`
    const textureFile = `./public/tiles/${id}/landcover_texture.png`
    const textureFileSmall = `./public/tiles/${id}/landcover_texture_100.png`
    const geoTiffFile = `./public/tiles/${id}/landcover_texture.tif`
    const geoTiffFileSmall = `./public/tiles/${id}/landcover_texture_100.tif`
    const satelliteFile = `./public/tiles/${id}/sattelite.png`

    // read coverage data

    let coverage = {}
    try {
      coverage = JSON.parse(
        fs.readFileSync(`./public/tiles/${id}/coverage.json`, 'utf8')
      )
    } catch (_) {}

    return {
      id,
      landcover: fs.existsSync(landcoverFile)
        ? landcoverFile.replace('./public', '')
        : null,
      landcoverSmall: fs.existsSync(landcoverFileSmall)
        ? landcoverFileSmall.replace('./public', '')
        : null,
      heightmap: fs.existsSync(heightmapFile)
        ? heightmapFile.replace('./public', '')
        : null,
      satellite: fs.existsSync(satelliteFile)
        ? satelliteFile.replace('./public', '')
        : null,
      texture: fs.existsSync(textureFile)
        ? textureFile.replace('./public', '')
        : null,
      textureSmall: fs.existsSync(textureFileSmall)
        ? textureFileSmall.replace('./public', '')
        : null,
      geoTiff: fs.existsSync(geoTiffFile)
        ? geoTiffFile.replace('./public', '')
        : null,
      geoTiffSmall: fs.existsSync(geoTiffFileSmall)
        ? geoTiffFileSmall.replace('./public', '')
        : null,
      coverage,
      ...tileData,
    }
  })

  res.send(tiles)
})

app.post('/tile', async (req, res) => {
  const { coords, zoom, islandMask } = req.body
  console.log('POST /tile', coords, zoom, islandMask)

  const [tileId, alreadyExists] = await mapbox.createTile(coords, zoom)
  res.send({
    id: tileId,
  })

  if (alreadyExists) {
    return
  }

  await mapbox.getTileData(tileId)
  if (islandMask) {
    await segmenter.getLandcoversForTile(tileId)
  }
  await combineLandcoverAndRecolor(tileId)

  await convertLandcoverToRGBTexture(tileId)
  await heightmap.modifyHeightmap(tileId)
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
  const { coords, zoom } = req.body

  console.log('POST /area', coords, zoom)

  createArea({ coords, zoom })
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

  await convertLandcoverToRGBTexture(id)

  // await heightmap.modifyHeightmap(id)
  res.send('Image saved successfully')
})

app.listen(7777, () => {
  console.log('Example app listening on port 7777!')
})
