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

const convertToGrayScale = async (inputPath, outputPath) =>
  sharp(inputPath).grayscale().toFile(outputPath)

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

  return {
    minHeight,
    maxHeight,
    heightMapData,
  }
}

const mergeHeightmaps = (heightmap1, heightmap2, multiplier = 1) => {
  const size = Math.sqrt(heightmap1.length)
  const mergedHeightmap = new Float32Array(size * size)

  for (let i = 0; i < size * size; i++) {
    mergedHeightmap[i] = heightmap1[i] + heightmap2[i] * multiplier
  }

  return mergedHeightmap
}

const multiplyHeightmaps = (original, mask, options) => {
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

const generateOutline = async (inputFile, outputFile) => {
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

const normalizeColorsBeforeStitching = async (imagePaths) => {
  console.log(imagePaths)
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
  updatePixelValues,
  stitchTileImages,
  promiseSeries,
  tileToId,
  generateOutline,
  minTilesForCoords,
  normalizeColorsBeforeStitching,
  convertToGrayScale,
}

// const run = async () => {
//   const path = './public/tiles/7cff2c615067bafdaf154ec56993c26cfc025140'

//   // get all folders in path
//   const folders = fs.readdirSync(path).filter((f) => {
//     // take only folders
//     return fs.statSync(`${path}/${f}`).isDirectory()
//   })

//   // get all heightmap files in each folder
//   const heightMaps = folders.map((folder) => {
//     const heightMapPath = `${path}/${folder}/heightmap.png`
//     const tileJsonPath = `${path}/${folder}/tile.json`

//     return {
//       heightMapPath,
//       tile: JSON.parse(fs.readFileSync(tileJsonPath, 'utf8')),
//     }
//   })
//   console.log(heightMaps)

//   // sort by index of tile
//   heightMaps.sort((a, b) => {
//     if (a.tile.index === b.tile.index) {
//       return 0
//     }
//     return a.tile.index > b.tile.index ? 1 : -1
//   })

//   // map to only have image paths
//   const imagePaths = heightMaps.map((h) => h.heightMapPath)

//   // convert to grayscale
//   await Promise.all(
//     imagePaths.map((path) =>
//       convertToGrayScale(path, path.replace('.png', '_grayscale.jpg'))
//     )
//   )
//   console.log(imagePaths)

//   normalizeColorsBeforeStitching(
//     imagePaths.map((path) => path.replace('.png', '_grayscale.jpg'))
//   )
// }

// run()
