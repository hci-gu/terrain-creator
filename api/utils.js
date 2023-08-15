const fs = require('fs')
const turf = require('@turf/turf')
const cover = require('@mapbox/tile-cover')
const sha1 = require('sha1')
const sharp = require('sharp')

const writeFile = (file, fileName) => {
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

const createFolder = (path) => {
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

const writePixelsToPng = (pixels, width, height, fileName) => {
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

const invertImage = async (imagePath) => {
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

const resizeAndConvert = async (imagePath, toSize) => {
  const tmpPath = imagePath.replace('.png', '_tmp.png')

  await sharp(imagePath).resize(toSize, toSize).png().toFile(tmpPath)

  // remove original file
  fs.unlinkSync(imagePath)
  // rename back
  fs.renameSync(tmpPath, imagePath)
}

const getPixelDataFromFile = async (file) => {
  const buffer = await sharp(file).raw().toBuffer()

  return new Uint8ClampedArray(buffer)
}

const getEdgePixels = async (imagePath, edge) => {
  // convert the image to raw pixel data
  const {
    data,
    info: { width, height },
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
        let index = (y * width + x) * 4
        // Add the pixel value to the array
        edgePixels.push(pixels[index])
      }
    }
  }

  return edgePixels
}

async function reducePixelValue(imagePath, reductionValue) {
  // load the image and convert to raw pixel data
  const {
    data,
    info: { width, height, channels },
  } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true })

  // Traverse the buffer
  for (let i = 0; i < width * height * channels; i += channels) {
    // reduce r,g,b values by the reductionValue
    data[i] = Math.max(0, data[i] - reductionValue)
    data[i + 1] = Math.max(0, data[i + 1] - reductionValue)
    data[i + 2] = Math.max(0, data[i + 2] - reductionValue)
  }

  // write the modified data back to the image
  return sharp(data, { raw: { width, height, channels } }).toFile(imagePath)
}

const convertPngToHeightMap = (data) => {
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

  return heightMapData
}

const mergeHeightmaps = (heightmap1, heightmap2, multiplier = 1) => {
  const size = Math.sqrt(heightmap1.length)
  const mergedHeightmap = new Float32Array(size * size)

  for (let i = 0; i < size * size; i++) {
    mergedHeightmap[i] = heightmap1[i] + heightmap2[i] * multiplier
  }

  return mergedHeightmap
}

const multiplyHeightmaps = (heightmap1, heightmap2) => {
  const size = Math.sqrt(heightmap1.length)
  const mergedHeightmap = new Float32Array(size * size)

  for (let i = 0; i < size * size; i++) {
    mergedHeightmap[i] = heightmap1[i] * heightmap2[i]
  }

  return mergedHeightmap
}

const stitchTileImages = (images, outPath) => {
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

const promiseSeries = (items, method) => {
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

const minTilesForCoords = (coords) => {
  var line = turf.lineString(coords)
  var bbox = turf.bbox(line)
  const bboxPolygon = turf.bboxPolygon(bbox)

  const tiles = cover.tiles(bboxPolygon.geometry, {
    min_zoom: 10,
    max_zoom: 14,
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

const tileToId = (tile) => sha1(tile.join('_'))

module.exports = {
  convertPngToHeightMap,
  writePixelsToPng,
  invertImage,
  resizeAndConvert,
  writeFile,
  createFolder,
  getPixelDataFromFile,
  getEdgePixels,
  multiplyHeightmaps,
  mergeHeightmaps,
  reducePixelValue,
  stitchTileImages,
  promiseSeries,
  tileToId,
  minTilesForCoords,
}
