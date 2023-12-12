import sharp from 'sharp'
import * as COLORS from './colors.js'
import alea from 'alea'
import fs from 'fs'
import { createNoise2D } from 'simplex-noise'
import { createGeoTiff, getCoverTileData } from './utils.js'
import { landcoverQueue } from './queues.js'

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

// convert rgb to hsl
function rgbToHsl([r, g, b]) {
  // Convert RGB to a 0-1 range
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h,
    s,
    l = (max + min) / 2

  if (max === min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h * 360, s * 100, l * 100]
}

const hslDistance = (hsl1, hsl2) => {
  const hDiff = hsl1[0] - hsl2[0]
  const sDiff = hsl1[1] - hsl2[1]
  const lDiff = hsl1[2] - hsl2[2]

  return (
    Math.sqrt(hDiff * hDiff) +
    Math.sqrt(sDiff * sDiff) / 2 +
    Math.sqrt(lDiff * lDiff) / 3
  )
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

export const combineLandcoverAndRecolor = async (tileId) => {
  const tileFolder = `./public/tiles/${tileId}`

  // first recolor and resize the landcover file
  const landCoverFile = `${tileFolder}/landcover.png`
  const landCoverFileColors = `${tileFolder}/landcover_colors.png`
  await fixEELandcover(landCoverFile, landCoverFileColors, 1024)

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

  try {
    await combineLandcoverAndRecolor(tileId)
    await convertLandcoverToRGBTexture(tileId)
    done()
  } catch (e) {
    done(e)
  }
})
