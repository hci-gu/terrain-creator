const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const {
  promiseSeries,
  stitchTileImages,
  invertImage,
  resizeAndConvert,
  generateOutline,
} = require('./utils')

const segmentTile = async (imagePath, writePath, prompt) => {
  const url = 'http://130.241.23.169:8765/segment'
  const formData = new FormData()

  formData.append('image', fs.createReadStream(imagePath))

  const jsonData = JSON.stringify({ prompt, only_mask: true })
  formData.append('json_data', jsonData)

  try {
    console.log('SEGMENT')
    const response = await axios.post(url, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer',
    })
    fs.writeFileSync(writePath, response.data)

    return writePath
  } catch (error) {
    console.error('Error:', error.response.data)
  }
}

module.exports = {
  segmentTile,
  getLandcoversForTile: async (tileId) => {
    const path = `./public/tiles/${tileId}`
    const mask_file = `${path}/island_mask.png`

    if (fs.existsSync(mask_file)) {
      return [
        {
          name: 'landcover',
          file: `${path}/landcover.png`,
          type: 'multiply',
          amount: 0.5,
          blur: 8,
        },
        {
          name: 'island_mask',
          file: mask_file,
          type: 'multiply',
          amount: 0.1,
          blur: 12,
        },
        {
          name: 'landcover_sand',
          file: `${path}/landcover_sand.png`,
          type: 'multiply',
          amount: 0.2,
          blur: 4,
        },
      ]
    }

    // get all folders in path
    const folders = fs
      .readdirSync(path, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)

    const partTiles = folders
      .map((folder) => {
        const tileJson = JSON.parse(
          fs.readFileSync(`${path}/${folder}/tile.json`)
        )

        return [`${path}/${folder}/stitched.png`, tileJson.index]
      })
      .sort((a, b) => a[1] - b[1])
      .map((a) => a[0])

    const parts = await promiseSeries(partTiles, (partTile) =>
      segmentTile(
        partTile,
        partTile.replace('stitched.png', 'island_mask.png'),
        'water'
      )
    )

    await stitchTileImages(parts, mask_file)
    await invertImage(mask_file)
    await resizeAndConvert(mask_file, 1024)

    await generateOutline(mask_file, `${path}/landcover_sand.png`)

    return [
      {
        name: 'landcover',
        file: `${path}/landcover.png`,
        type: 'multiply',
        amount: 0.5,
        blur: 8,
      },
      {
        name: 'island_mask',
        file: mask_file,
        type: 'multiply',
        amount: 0.1,
        blur: 12,
      },
      {
        name: 'landcover_sand',
        file: `${path}/landcover_sand.png`,
        type: 'multiply',
        amount: 0.2,
        blur: 4,
      },
    ]
  },
}