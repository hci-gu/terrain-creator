const axios = require('axios')
const baseUrl =
  'https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps'
const GOOGLE_EARTH_ID =
  'fe7eda0941e04d2b3aac0d0aa1da729d-6a95b41780c1294eddee9beb8675026c'

const downloadTile = async (tile) => {
  const [x, y, zoom] = tile
  let url = `${baseUrl}/${GOOGLE_EARTH_ID}/tiles/${zoom}/${x}/${y}`
  console.log('GOOGLE_EARTH_URL', url)

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  })

  return response.data
}

module.exports = {
  downloadTile,
}
