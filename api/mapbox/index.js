import dotenv from 'dotenv'
dotenv.config()
import axios from 'axios'
import * as pocketbase from '../../lib/pocketbase.js'

const ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN
const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME
const MAPBOX_STYLE_ID = process.env.MAPBOX_STYLE_ID

const baseUrl = 'https://api.mapbox.com/v4'
const downloadTile = async (tile, type = 'mapbox.terrain-rgb') => {
  const [x, y, zoom] = tile
  let url = `${baseUrl}/${type}/${zoom}/${x}/${y}@2x.pngraw?access_token=${ACCESS_TOKEN}`
  if (type === 'landcover-grass') {
    url = `https://api.mapbox.com/styles/v1/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}/tiles/${zoom}/${x}/${y}?access_token=${ACCESS_TOKEN}&fresh=true`
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    })

    return response.data
  } catch (e) {
    console.log('Failed to download tile', e)
  }
}

pocketbase.subscribe('tiles', '*', async ({ action, record }) => {
  if (action == pocketbase.ACTIONS.CREATE) {
    const tile = [record.x, record.y, record.zoom]
    const imageData = await downloadTile(tile, 'mapbox.satellite')
    const file = new File([imageData], 'satellite.png')

    await pocketbase.updateTile(record.id, {
      satellite: file,
    })

    const rgbHeightMap = await downloadTile(tile, 'mapbox.terrain-rgb')
    const hmFile = new File([rgbHeightMap], 'original.png')
    await pocketbase.createHeightMap(record.id, hmFile)
  }
})
