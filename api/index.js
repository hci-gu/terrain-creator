require('dotenv').config()

const express = require('express')
const fs = require('fs')
const mapboxUtils = require('./mapbox')
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

  const tile = await mapboxUtils.getTile(coords)

  //   const file = await writeFile(tile)

  res.send(tile)
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
