const sharp = require('sharp')

const stitchTileImages = (images) => {
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
          .toBuffer()
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

module.exports = {
  stitchTileImages,
  promiseSeries,
}
