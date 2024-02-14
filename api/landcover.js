import sharp from 'sharp'
import * as COLORS from './colors.js'
import alea from 'alea'
import fs from 'fs'
import { createNoise2D } from 'simplex-noise'
import {
  createGeoTiff,
  getCoverTileData,
  hslDistance,
  rgbToHsl,
} from './utils.js'
import { landcoverQueue } from './queues.js'
import { getTileData } from './mapbox/index.js'

const generateOutline = async (image, size) => {
  const original = await image.png().toBuffer()

  // Dilate the shapes with a larger blur and threshold back to binary
  const dilated = await sharp(original)
    .blur(size) // Adjust for even thicker dilation
    .threshold(190) // Higher threshold for more solid outline
    .toBuffer()

  // Outer edge
  const outerEdge = await sharp(original)
    .composite([{ input: dilated, blend: 'difference' }])
    .toBuffer()

  // Inner edge
  const innerEdge = await sharp(dilated)
    .composite([{ input: original, blend: 'difference' }])
    .toBuffer()

  // Combine the two edges
  const combinedEdges = await sharp(outerEdge)
    .composite([{ input: innerEdge, blend: 'add' }])
    .toBuffer()

  // Apply another threshold to ensure solid black and white
  const outline = await sharp(combinedEdges).threshold(128).toBuffer()

  const final = await sharp(outline).blur(4).threshold(128).toBuffer()

  return sharp(final).threshold(128)
}

async function generateNoiseImage(width, height, size = 20) {
  const prng = alea(Math.floor(Math.random() * 10000000))
  const noise2D = createNoise2D(prng)
  const noiseBuffer = Buffer.alloc(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = (noise2D(x / size, y / size) + 1) * 0.5 * 255
      const idx = (y * width + x) * 4
      // set value to either 0 or 255
      value = value > 128 ? 255 : 0

      noiseBuffer[idx] = value
      noiseBuffer[idx + 1] = value
      noiseBuffer[idx + 2] = value
      noiseBuffer[idx + 3] = 255
    }
  }

  return sharp(noiseBuffer, { raw: { width, height, channels: 4 } }).resize(
    1024,
    1024
  )
}

async function noiseOutlineOfImage(image) {
  const noiseImage = await generateNoiseImage(1024, 1024, 15)

  const outline = await generateOutline(image, 6)

  const mask = await noiseImage.composite([
    {
      input: await outline.toBuffer(),
      blend: 'multiply',
    },
  ])

  const processed = await image
    .composite([
      {
        input: await mask.toBuffer(),
        raw: {
          width: 1024,
          height: 1024,
          channels: 4,
        },
        blend: 'add',
      },
    ])
    .threshold(128)
    .toBuffer()

  return sharp(processed)
}

async function extractMask(inputPath, targetColor, name) {
  const maskImage = await sharp(inputPath)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { data, info } = maskImage
  const width = info.width
  const height = info.height
  const channels = info.channels

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels

      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const currentColor = [r, g, b]
      if (
        currentColor[0] === targetColor[0] &&
        currentColor[1] === targetColor[1] &&
        currentColor[2] === targetColor[2]
      ) {
        // Set the pixel to white if it's close enough to the target color
        data[idx] = 255
        data[idx + 1] = 255
        data[idx + 2] = 255
      } else {
        // Set the pixel to black otherwise
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
      }
    }
  }

  // Save the mask
  await sharp(data, {
    width: width,
    height: height,
    channels: channels,
    raw: {
      width: width,
      height: height,
      channels: channels,
    },
  }).toFile(`${name}_mask.png`)
}

const fixEELandcover = async (imagePath, outPath, resize, type = 'paint') => {
  const image = await sharp(imagePath)
    .resize(resize, resize, {
      kernel: sharp.kernel.nearest,
      fit: 'contain',
      position: 'center',
    })
    .raw()
    .toBuffer({
      resolveWithObject: true,
    })
  const { data, info } = image
  const width = info.width
  const height = info.height
  const channels = info.channels

  const landCoverColors = Object.keys(COLORS.LANDCOVER_COLORS).map((key) => ({
    name: key,
    ...COLORS.LANDCOVER_COLORS[key],
  }))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels

      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const sortedHsl = landCoverColors
        .map((color) => {
          const hsl1 = rgbToHsl([r, g, b])
          const hsl2 = rgbToHsl(color[type])
          return {
            ...color,
            distance: hslDistance(hsl1, hsl2),
          }
        })
        .sort((a, b) => a.distance - b.distance)

      data[idx] = sortedHsl[0][type][0]
      data[idx + 1] = sortedHsl[0][type][1]
      data[idx + 2] = sortedHsl[0][type][2]
      data[idx + 3] = sortedHsl[0][type][3]
    }
  }

  await sharp(data, {
    width: width,
    height: width,
    channels: channels,
    raw: {
      width: width,
      height: height,
      channels: channels,
    },
  }).toFile(outPath)
}

export const combineLandcoverAndRecolor = async (tileId, size = 512) => {
  const tileFolder = `./public/tiles/${tileId}`

  // first recolor and resize the landcover file
  const landCoverFile = `${tileFolder}/landcover.png`
  const landCoverFileColors = `${tileFolder}/landcover_colors.png`
  await fixEELandcover(landCoverFile, landCoverFileColors, size)

  for (let key in COLORS.EE_COLORS) {
    await extractMask(
      landCoverFileColors,
      COLORS.EE_COLORS[key],
      `${tileFolder}/${key}`
    )
  }
}

export const convertLandcoverToRGBTexture = async (tileId) => {
  const tileFolder = `./public/tiles/${tileId}`

  let landCoverFile = `${tileFolder}/landcover_colors_edited.png`

  if (!fs.existsSync(landCoverFile)) {
    landCoverFile = `${tileFolder}/landcover_colors.png`
  }

  const landCoverColors = Object.keys(COLORS.LANDCOVER_COLORS).map((key) => ({
    name: key,
    ...COLORS.LANDCOVER_COLORS[key],
  }))

  const maskImage = await sharp(landCoverFile).raw().toBuffer({
    resolveWithObject: true,
  })

  const { data, info } = maskImage
  const width = info.width
  const height = info.height
  const channels = info.channels

  const coverageMap = Object.keys(COLORS.LANDCOVER_COLORS).reduce(
    (acc, key) => {
      acc[key] = 0
      return acc
    },
    {}
  )

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels

      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const currentColor = [r, g, b]

      for (let i = 0; i < landCoverColors.length; i++) {
        const color = landCoverColors[i]
        if (
          currentColor[0] === color.paint[0] &&
          currentColor[1] === color.paint[1] &&
          currentColor[2] === color.paint[2]
        ) {
          data[idx] = color.texture[0]
          data[idx + 1] = color.texture[1]
          data[idx + 2] = color.texture[2]
          data[idx + 3] = color.texture[3]
          coverageMap[color.name]++
          break
        }
      }
    }
  }
  // convet coverageMap to percentages
  const totalPixels = width * height
  for (let key in coverageMap) {
    coverageMap[key] = coverageMap[key] / totalPixels
  }
  fs.writeFileSync(
    `${tileFolder}/coverage.json`,
    JSON.stringify(coverageMap, null, 2)
  )

  const textureFilePath = `${tileFolder}/landcover_texture.png`
  // Save the mask
  await sharp(data, {
    width: width,
    height: height,
    channels: channels,
    raw: {
      width: width,
      height: height,
      channels: channels,
    },
  }).toFile(textureFilePath)

  const tileData = getCoverTileData(tileId)

  // create a smaller version that is 100x100 pixels but keep the exact colors
  await fixEELandcover(
    textureFilePath,
    textureFilePath.replace('.png', '_100.png'),
    100,
    'texture'
  )

  await fixEELandcover(
    landCoverFile,
    landCoverFile.replace('.png', '_100.png'),
    100
  )

  await createGeoTiff(
    textureFilePath,
    tileData.bbox,
    textureFilePath.replace('.png', '.tif')
  )
  const smallTexture = textureFilePath.replace('.png', '_100.png')
  await createGeoTiff(
    smallTexture,
    tileData.bbox,
    smallTexture.replace('.png', '.tif')
  )
}

export const recreateTextureAndGeoTiffForTile = async (tileId) => {
  const tileFolder = `./public/tiles/${tileId}`

  const tileData = getCoverTileData(tileId)

  const textureFilePath = `${tileFolder}/landcover_texture.png`

  await createGeoTiff(
    textureFilePath,
    tileData.bbox,
    textureFilePath.replace('.png', '.tif')
  )
}

landcoverQueue.process(4, async (job, done) => {
  const { tileId } = job.data
  const path = `./public/tiles/${tileId}`
  const { size } = JSON.parse(fs.readFileSync(`${path}/tile.json`))

  try {
    await combineLandcoverAndRecolor(tileId, size ?? 512)
    await convertLandcoverToRGBTexture(tileId)
    done()
  } catch (e) {
    done(e)
  }
})
