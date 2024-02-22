import { config } from 'dotenv'
config()

import express from 'express'
import bodyParser from 'body-parser'
import * as googleEarthEngine from './google-earth-engine/index.js'
import './mapbox/index.js'
import cors from 'cors'
googleEarthEngine.initEE()

const app = express()

app.use(cors())
app.use(bodyParser({ limit: '25mb' }))
app.use(express.json())

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(7777, () => {
  console.log('Example app listening on port 7777!')
})
