require('dotenv').config()

const express = require('express')
const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')
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
      landcover: `/tiles/${id}/landcover_colors.png`,
      heightmap: `/tiles/${id}/heightmap_with_blur_with_noise.png`,
      satellite: `/tiles/${id}/sattelite.png`,
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

// route to accept posted image
app.post('/tile/:id/landcover', async (req, res) => {
  const { id } = req.params

  // Create a new canvas
  const canvas = createCanvas(1024, 1024) // Adjust dimensions as needed
  const ctx = canvas.getContext('2d')

  // Load the image from the data URL
  const image = await loadImage(req.body.image)
  ctx.drawImage(image, 0, 0, 1024, 1024)

  const outputPath = `./public/tiles/${id}/landcover_colors_edited.png` // Provide a valid file path
  const stream = canvas.createPNGStream()
  const out = require('fs').createWriteStream(outputPath)
  stream.pipe(out)

  out.on('finish', () => {
    console.log('Image saved as PNG')
    res.status(200).send('Image saved as PNG')
  })
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
