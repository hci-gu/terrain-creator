import * as turf from '@turf/turf'
import cover from '@mapbox/tile-cover'
import sha1 from 'sha1'
import sharp from 'sharp'
import distanceTable from './mapbox/mapbox_distance_table.json' assert { type: 'json' }

export const stitchTileImages = (images) => {
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

export const getMetersPerPixel = (zoom, latitude) => {
  // round for example 57.7 to 60
  const roundedLatitude = Math.round(latitude / 20) * 20
  return distanceTable[zoom][roundedLatitude]
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
