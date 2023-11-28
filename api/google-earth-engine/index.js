import axios from 'axios'
import ee from '@google/earthengine'
import privateKey from './service_account.json' assert { type: 'json' }
// ee.data.authenticateViaPrivateKey(privateKey)
// ee.initialize()

export const downloadTile = async (url, tile) => {
  const [x, y, zoom] = tile
  let requestUrl = url.replace('{x}', x).replace('{y}', y).replace('{z}', zoom)
  console.log('GOOGLE_EARTH_URL', requestUrl)

  const response = await axios.get(requestUrl, {
    responseType: 'arraybuffer',
  })

  return response.data
}

let cachedEEInstance = {
  date: null,
  instance: null,
}
export const initEE = () => {
  return new Promise((resolve) => {
    // if we have a cached instance and its less than 10 minutes old, use it
    if (
      cachedEEInstance.instance != null &&
      cachedEEInstance.date &&
      new Date() - cachedEEInstance.date < 600000
    ) {
      console.log('resolve cached instance')
      resolve(cachedEEInstance.instance.urlFormat)
      return
    }

    console.log('refresh cached instance')

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
              cachedEEInstance = {
                date: new Date(),
                instance: map,
              }
              resolve(map.urlFormat)
            })
          },
          (e) => console.error('Initialization error: ' + e)
        )
      },
      (e) => console.error('Authentication error: ' + e)
    )
  })
}
