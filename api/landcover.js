import sharp from 'sharp'
import * as COLORS from './colors.js'
import alea from 'alea'
import fs from 'fs'
import { createNoise2D } from 'simplex-noise'
import { createGeoTiff, getCoverTileData } from './utils.js'

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

function colorDistance(color1, color2) {
  const rDiff = color1[0] - color2[0]
  const gDiff = color1[1] - color2[1]
  const bDiff = color1[2] - color2[2]

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
}

async function extractMask(inputPath, targetColor) {
  const maskImage = await sharp(inputPath)
    .resize(1024, 1024)
    .toColourspace('srgb')
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
      if (colorDistance(targetColor, currentColor) <= 55) {
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
  const mask = await sharp(data, {
    width: width,
    height: height,
    channels: channels,
    raw: {
      width: width,
      height: height,
      channels: channels,
    },
  })

  return noiseOutlineOfImage(mask)
}

async function combineMasksWithColors(masks, width, height) {
  // Create a blank base image buffer (black in this example)
  let baseImageBuffer = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer() // Ensure the base image buffer is in PNG format

  for (const { image, color } of masks) {
    const overlayBuffer = await image
      .threshold(128) // Ensure the image is truly black and white
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data }) => {
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
            data[i] = color[0]
            data[i + 1] = color[1]
            data[i + 2] = color[2]
          }
        }
        return sharp(data, {
          width: width,
          height: height,
          channels: 3,
          raw: {
            width: width,
            height: height,
            channels: 4,
          },
        })
          .png()
          .toBuffer() // Convert to PNG format
      })

    baseImageBuffer = await sharp(baseImageBuffer)
      .composite([{ input: overlayBuffer }])
      .toBuffer()
  }

  return sharp(baseImageBuffer)
}

async function mergeAndColorize(images, size) {
  const colorizedImages = await Promise.all(
    images.map(({ image, color }) => {
      return image
        .threshold()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          const { width, height, channels } = info
          for (let i = 0; i < width * height * channels; i += channels) {
            if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
              data[i] = color[0]
              data[i + 1] = color[1]
              data[i + 2] = color[2]
              data[i + 3] = 255
            } else {
              data[i + 3] = 0
            }
          }
          return sharp(data, { raw: info }).png()
        })
    })
  )

  let baseImage = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 94, g: 101, b: 114, alpha: 255 },
    },
  })

  const composites = await Promise.all(
    colorizedImages.map(async (image) => ({
      input: await image.toBuffer(),
      blend: 'over',
    }))
  )

  return baseImage.composite(composites)
}

const invertColorsOfImage = (image) => {
  return image
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      // Invert the colors, so that black becomes white and vice versa
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i]
        data[i + 1] = 255 - data[i + 1]
        data[i + 2] = 255 - data[i + 2]
      }

      // Save the inverted image
      return sharp(data, {
        width: info.width,
        height: info.height,
        channels: info.channels,
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
    })
}

export const combineLandcoverAndRecolor = async (tileId) => {
  const tileFolder = `./public/tiles/${tileId}`

  const landCoverFile = `${tileFolder}/landcover.png`
  const islandMaskFile = `${tileFolder}/island_mask.png`
  const sandMaskFile = `${tileFolder}/landcover_sand.png`

  const eeColors = COLORS.earthEngine()

  let masksToCombine = []
  for (let key in eeColors) {
    const mask = await extractMask(landCoverFile, eeColors[key])

    masksToCombine.push({
      image: mask,
      color: COLORS.LANDCOVER_COLORS[key].paint,
    })
  }

  // check if islandMaskFile exists
  if (fs.existsSync(islandMaskFile)) {
    let sandMask = await sharp(sandMaskFile)
    sandMask = await noiseOutlineOfImage(sandMask)
    const islandMask = sharp(islandMaskFile)
    const oceanMask = await invertColorsOfImage(islandMask)
    masksToCombine = [
      ...masksToCombine,
      { image: oceanMask, color: COLORS.LANDCOVER_COLORS.water.paint },
      { image: sandMask, color: COLORS.LANDCOVER_COLORS.sand.paint },
    ]
  }

  const combined = await mergeAndColorize(masksToCombine, 1024, 1024)

  return new Promise((resolve) => {
    combined.toFile(
      landCoverFile.replace('landcover', 'landcover_colors'),
      () => resolve()
    )
  })
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
      let matchedColor = false
      for (let i = 0; i < landCoverColors.length; i++) {
        const color = landCoverColors[i]
        if (r == color.paint[0] && g == color.paint[1] && b == color.paint[2]) {
          data[idx] = color.texture[0]
          data[idx + 1] = color.texture[1]
          data[idx + 2] = color.texture[2]
          data[idx + 3] = color.texture[3]
          matchedColor = true
          coverageMap[color.name]++
          break
        }
      }
      if (!matchedColor) {
        for (let i = 0; i < landCoverColors.length; i++) {
          const color = landCoverColors[i]
          if (colorDistance([r, g, b], color.paint) <= 100) {
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

  // create a smaller version that is 100x100 pixels but keep the exakt colors
  await sharp(textureFilePath)
    .resize(100, 100, {
      kernel: sharp.kernel.nearest,
      fit: 'contain',
      position: 'center',
    })
    .toFile(textureFilePath.replace('.png', '_100.png'))

  await sharp(landCoverFile)
    .resize(100, 100, {
      kernel: sharp.kernel.nearest,
      fit: 'contain',
      position: 'center',
    })
    .toFile(landCoverFile.replace('.png', '_100.png'))

  await createGeoTiff(
    textureFilePath,
    tileData.bbox,
    textureFilePath.replace('.png', '.tif')
  )
}
