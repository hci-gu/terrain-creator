const axios = require('axios')
const baseUrl =
  'https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps'
const GOOGLE_EARTH_ID =
  'aaee9c1fa37cf5e18679808398d864e3-6bc01534cce2f3b8b535cca3a0b3179e'

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
