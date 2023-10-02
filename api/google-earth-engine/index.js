const axios = require('axios')
const ee = require('@google/earthengine')

var privateKey = require('./service_account.json')
// ee.data.authenticateViaPrivateKey(privateKey)
// ee.initialize()

const downloadTile = async (url, tile) => {
  const [x, y, zoom] = tile
  let requestUrl = url.replace('{x}', x).replace('{y}', y).replace('{z}', zoom)
  console.log('GOOGLE_EARTH_URL', requestUrl)

  const response = await axios.get(requestUrl, {
    responseType: 'arraybuffer',
  })

  return response.data
}

module.exports = {
  downloadTile,
  initEE: () => {
    return new Promise((resolve) => {
      ee.data.authenticateViaPrivateKey(
        privateKey,
        () => {
          ee.initialize(
            null,
            null,
            () => {
              const dynamicworld = ee
                .ImageCollection('GOOGLE/DYNAMICWORLD/V1')
                .filterDate('2023-01-01', '2023-08-20')

              const classification = dynamicworld.select('label')
              const dwVisParams = {
                min: 0,
                max: 8,
                palette: [
                  '#419BDF',
                  '#397D49',
                  '#88B053',
                  '#7A87C6',
                  '#E49635',
                  '#DFC35A',
                  '#C4281B',
                  '#A59B8F',
                  '#B39FE1',
                ],
              }

              classification.getMap(dwVisParams, function (map) {
                resolve(map.urlFormat)
              })
            },
            (e) => console.error('Initialization error: ' + e)
          )
        },
        (e) => console.error('Authentication error: ' + e)
      )
    })
  },
}
