import fs from 'fs'
import * as turf from '@turf/turf'
import cover from '@mapbox/tile-cover'
import sha1 from 'sha1'
import sharp from 'sharp'
import { getMetersPerPixel, tileToBBOX } from './mapbox/utils.js'
import { exec } from 'child_process'

export const writeFile = (file, fileName) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, file, 'binary', (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

export const createFolder = (path) => {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

export const convertToGrayScale = async (inputPath, outputPath) =>
  sharp(inputPath).grayscale().toFile(outputPath)

export const writePixelsToPng = (pixels, width, height, fileName) => {
  return sharp(pixels, {
    raw: {
      width,
      height,
      channels: 4, // for RGBA
    },
  })
    .png()
    .toFile(fileName)
}

export const invertImage = async (imagePath) => {
  const tmpPath = imagePath.replace('.png', '_inverted.png')

  await sharp(imagePath)
    .negate({
      alpha: false,
    })
    .toFile(tmpPath)

  // remove original file
  fs.unlinkSync(imagePath)
  // rename back
  fs.renameSync(tmpPath, imagePath)
}

export const resizeAndConvert = async (imagePath, toSize) => {
  const tmpPath = imagePath.replace('.png', '_tmp.png')

  await sharp(imagePath)
    .resize(toSize, toSize)
    .ensureAlpha()
    .png()
    .toFile(tmpPath)

  // remove original file
  fs.unlinkSync(imagePath)
  // rename back
  fs.renameSync(tmpPath, imagePath)
}

export const getPixelDataFromFile = async (file) => {
  const buffer = await sharp(file).raw().toBuffer()

  return new Uint8ClampedArray(buffer)
}

export const getEdgePixels = async (imagePath, edge) => {
  // convert the image to raw pixel data
  const {
    data,
    info: { width, height, channels },
  } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true })
  const pixels = new Uint8ClampedArray(data)

  let edgePixels = []

  // Traverse the buffer
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check if the pixel is on the specified edge
      if (
        (edge === 'left' && x === 0) ||
        (edge === 'right' && x === width - 1) ||
        (edge === 'top' && y === 0) ||
        (edge === 'bottom' && y === height - 1)
      ) {
        // Calculate the index of the pixel in the buffer
        // This calculation assumes a grayscale image
        // For RGB images, the index should be (y * width + x) * 3
        let index = (y * width + x) * channels
        // Add the pixel value to the array
        edgePixels.push(pixels[index])
      }
    }
  }

  return edgePixels
}

async function updatePixelValues(inPath, outPath, amount) {
  return sharp(inPath).linear(amount, 0).toFile(outPath)
}

export const convertPngToHeightMap = (data) => {
  const heightMap = []
  let maxHeight = -Infinity
  let minHeight = Infinity
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const height = -10000 + (r * 256 * 256 + g * 256 + b) * 0.1
    heightMap.push(height)

    if (height > maxHeight) {
      maxHeight = height
    }
    if (height < minHeight) {
      minHeight = height
    }
  }

  // clamp heightmap between 0 and 1 based on min and max height
  for (let i = 0; i < heightMap.length; i++) {
    const height = heightMap[i]
    const normalizedHeight = (height - minHeight) / (maxHeight - minHeight)
    heightMap[i] = normalizedHeight
  }

  // create new png image from heightmap where 0 is black and 1 is white
  const heightMapData = new Float32Array(heightMap.length * 4)
  for (let i = 0; i < heightMap.length; i++) {
    const height = heightMap[i]
    const color = height * 255
    heightMapData[i * 4] = color
    heightMapData[i * 4 + 1] = color
    heightMapData[i * 4 + 2] = color
    heightMapData[i * 4 + 3] = 255
  }

  return {
    minHeight,
    maxHeight,
    heightMapData,
  }
}

export const mergeHeightmaps = (heightmap1, heightmap2, multiplier = 1) => {
  const size = Math.sqrt(heightmap1.length)
  const mergedHeightmap = new Float32Array(size * size)

  for (let i = 0; i < size * size; i++) {
    mergedHeightmap[i] = heightmap1[i] + heightmap2[i] * multiplier
  }

  return mergedHeightmap
}

export const multiplyHeightmaps = (original, mask, options) => {
  const size = Math.sqrt(original.length)
  const mergedHeightmap = new Float32Array(size * size)

  for (let i = 0; i < size * size; i++) {
    if (mask[i] === 0) {
      mergedHeightmap[i] = original[i]
      continue
    }
    if (options.type === 'multiply') {
      mergedHeightmap[i] = original[i] * (options.amount * mask[i])
    } else if (options.type === 'subtract') {
      mergedHeightmap[i] = original[i] - options.amount * mask[i]
    } else if (options.type === 'add') {
      mergedHeightmap[i] = original[i] + options.amount * mask[i]
    }
  }

  return mergedHeightmap
}

export const stitchTileImages = (images, outPath) => {
  return Promise.all(images.map((image) => sharp(image).toBuffer()))
    .then((imageBuffers) => {
      // Get the metadata from the first image buffer,
      // assuming that all images have the same dimensions.
      return sharp(imageBuffers[0])
        .metadata()
        .then((metadata) => {
          return { imageBuffers, metadata }
        })
    })
    .then(({ imageBuffers, metadata }) => {
      // Create a new image that's twice the width and height.
      return (
        sharp({
          create: {
            width: metadata.width * 2,
            height: metadata.height * 2,
            channels: metadata.channels,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          // Composite the four images onto the new image.
          .composite([
            { input: imageBuffers[0], top: 0, left: 0 },
            { input: imageBuffers[1], top: 0, left: metadata.width },
            {
              input: imageBuffers[2],
              top: metadata.height,
              left: metadata.width,
            },
            {
              input: imageBuffers[3],
              top: metadata.height,
              left: 0,
            },
          ])
          .png()
          .toFile(outPath)
      )
    })
    .catch((err) => console.error(err))
}

export const generateOutline = async (inputFile, outputFile) => {
  const original = await sharp(inputFile).toBuffer()

  // Dilate the shapes with a larger blur and threshold back to binary
  const dilated = await sharp(original)
    .blur(12) // Adjust for even thicker dilation
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

  await sharp(final).threshold(128).toFile(outputFile)
}

export const promiseSeries = (items, method) => {
  const results = []

  function runMethod(item, index) {
    return new Promise((resolve, reject) => {
      method(item, index)
        .then((res) => {
          results.push(res)
          resolve(res)
        })
        .catch((err) => reject(err))
    })
  }

  return items
    .reduce(
      (promise, item) =>
        promise.then(() => runMethod(item, items.indexOf(item))),
      Promise.resolve()
    )
    .then(() => results)
}

export const minTilesForCoords = (coords, initialZoom = 10) => {
  var line = turf.lineString(coords)
  var bbox = turf.bbox(line)
  const bboxPolygon = turf.bboxPolygon(bbox)

  const tiles = cover.tiles(bboxPolygon.geometry, {
    min_zoom: initialZoom + 1,
    max_zoom: initialZoom + 1,
  })
  // tile is [x, y, zoom]
  // sort the tiles by x and y
  tiles.sort((a, b) => {
    if (a[1] === b[1]) {
      return a[0] - b[0]
    }
    return a[1] - b[1]
  })

  // flip second part of array
  const half = Math.ceil(tiles.length / 2)
  const top = tiles.slice(0, half)
  const bottom = tiles.slice(half, tiles.length).reverse()

  return [...top, ...bottom]
}

export const tileToId = (tile) => sha1(tile.join('_'))

const compareImageHeightsAndUpdate = async (
  imagePath1,
  imagePath2,
  edge1,
  edge2
) => {
  // get lightest pixel with its index from first edge
  const edgePixels1 = await getEdgePixels(imagePath1, edge1)
  let lightestPixel = Math.max(...edgePixels1)

  // get same pixel from second edge
  const edgePixels2 = await getEdgePixels(imagePath2, edge2)
  const lightestPixel2 = Math.max(...edgePixels2)

  let imageToDarken = imagePath1
  let lightestPixelIndex = edgePixels1.indexOf(lightestPixel)
  let comparablePixel = edgePixels2[lightestPixelIndex]
  if (lightestPixel2 > lightestPixel) {
    imageToDarken = imagePath2
    lightestPixelIndex = edgePixels2.indexOf(lightestPixel2)
    comparablePixel = edgePixels1[lightestPixelIndex]
    lightestPixel = lightestPixel2
  }

  // calculate difference
  const difference = lightestPixel - comparablePixel
  const percentDifference = difference / 255

  const updatedPath = imageToDarken.replace('.jpg', '_updated.jpg')
  await updatePixelValues(imageToDarken, updatedPath, 1 - percentDifference)

  return [
    imageToDarken === imagePath1 ? updatedPath : imagePath1,
    imageToDarken === imagePath2 ? updatedPath : imagePath2,
  ]
}

export const normalizeColorsBeforeStitching = async (imagePaths) => {
  if (imagePaths.length !== 4) {
    return imagePaths
  }
  const [updatedPath1, updatedPath2] = await compareImageHeightsAndUpdate(
    imagePaths[1],
    imagePaths[2],
    'bottom',
    'top'
  )
  const [updatedPath0, updatedPath3] = await compareImageHeightsAndUpdate(
    imagePaths[0],
    imagePaths[3],
    'bottom',
    'top'
  )

  return [updatedPath0, updatedPath1, updatedPath2, updatedPath3]
}

export const convertPngToRaw16Bit = async (inputPng, outputRaw) => {
  const rawBuffer = await sharp(inputPng)
    .ensureAlpha() // Ensure there's an alpha channel
    .raw() // Get raw, uncompressed image data
    .resize(1025, 1025)
    .toBuffer({ resolveWithObject: true })

  if (rawBuffer.info.channels !== 4) {
    throw new Error(
      'Expected the PNG to have 4 channels (RGBA) but found ' +
        rawBuffer.info.channels
    )
  }

  // Convert 8-bit data to 16-bit
  const input = rawBuffer.data
  const output = Buffer.alloc(input.length * 2) // 16 bits = 2 bytes

  for (let i = 0, j = 0; i < input.length; i++, j += 2) {
    const value16bit = (input[i] << 8) | input[i] // Repeat the 8-bit value in both high and low bytes for 16-bit
    output.writeUInt16LE(value16bit, j)
  }

  // Write the 16-bit data to a raw file
  fs.writeFileSync(outputRaw, output)
}

export const createGeoTiff = async (pngPath, bbox, outputGeoTiffPath) => {
  return new Promise((resolve) => {
    const command = `gdal_translate -of GTiff -a_srs EPSG:4326 -a_ullr ${bbox[0]} ${bbox[3]} ${bbox[2]} ${bbox[1]} ${pngPath} ${outputGeoTiffPath}`

    exec(command, (error, stdout, stderr) => {
      resolve(outputGeoTiffPath)
    })
  })
}

export const updateTileProgress = (tileId, progress = 0) => {
  let tileJson = {}
  try {
    tileJson = JSON.parse(fs.readFileSync(`./public/tiles/${tileId}/tile.json`))
  } catch (e) {}
  tileJson.progress = progress
  fs.writeFile(
    `./public/tiles/${tileId}/tile.json`,
    JSON.stringify(tileJson),
    () => {}
  )
}

const getTile = (path, id) => {
  let tileInfo = {}
  if (fs.existsSync(`${path}/${id}/tile.json`)) {
    tileInfo = JSON.parse(fs.readFileSync(`${path}/${id}/tile.json`))
    tileInfo = {
      ...tileInfo,
      bbox: tileToBBOX(tileInfo.tile),
    }
    const zoom = tileInfo.tile[2]
    tileInfo.getMetersPerPixel = getMetersPerPixel(zoom, tileInfo.bbox[1])
  }

  return {
    id,
    ...tileInfo,
  }
}

export const getCoverTileData = (id) => {
  const tileFolders = fs
    .readdirSync(`./public/tiles/${id}`, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())

  const tiles = tileFolders.map((dir) =>
    getTile(`./public/tiles/${id}`, dir.name)
  )
  const arrayOfBboxes = tiles.map((tile) => tile.bbox)

  let bbox = [Infinity, Infinity, -Infinity, -Infinity]

  // Iterate through the array of bboxes and expand the overall bbox
  arrayOfBboxes.forEach((tileBBOX) => {
    const [minX, minY, maxX, maxY] = tileBBOX
    bbox = [
      Math.min(minX, bbox[0]),
      Math.min(minY, bbox[1]),
      Math.max(maxX, bbox[2]),
      Math.max(maxY, bbox[3]),
    ]
  })

  const minHeight = Math.min(...tiles.map((tile) => tile.minHeight))
  const maxHeight = Math.max(...tiles.map((tile) => tile.maxHeight))

  return {
    bbox,
    minHeight,
    maxHeight,
    center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2],
    metersPerPixel: tiles[0].getMetersPerPixel,
    tiles,
  }
}
