const axios = require('axios')
const baseUrl =
  'https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps'
const GOOGLE_EARTH_ID =
  '6c308fc1f2712ed92e97086d11dffaf5-b054bf7bca60b28d2d1ce3ad001adf4d'

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
