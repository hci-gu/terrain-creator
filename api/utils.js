const fs = require('fs')
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

const getPixelDataFromFile = (file) => sharp(file).raw().toBuffer()

const convertPngToHeightMap = (png) => {
  const data = new Uint8ClampedArray(png)
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
  const heightMapData = new Uint8ClampedArray(heightMap.length * 4)
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

  function runMethod(item) {
    return new Promise((resolve, reject) => {
      method(item)
        .then((res) => {
          results.push(res)
          resolve(res)
        })
        .catch((err) => reject(err))
    })
  }

  return items
    .reduce(
      (promise, item) => promise.then(() => runMethod(item)),
      Promise.resolve()
    )
    .then(() => results)
}

module.exports = {
  convertPngToHeightMap,
  writePixelsToPng,
  writeFile,
  createFolder,
  getPixelDataFromFile,
  stitchTileImages,
  promiseSeries,
}
