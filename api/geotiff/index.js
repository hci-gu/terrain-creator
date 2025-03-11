import { fromUrl, fromArrayBuffer } from 'geotiff'
import { PNG } from 'pngjs'

import fs from 'fs'
import proj4 from 'proj4'

const EPSG3857 =
  '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
const EPSG3035 =
  '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs'
// The above is a known proj string for ETRS89-LAEA, but verify the exact parameters used in your GeoTIFF.

proj4.defs('EPSG:3857', EPSG3857)
proj4.defs('EPSG:3035', EPSG3035)

function reprojectBounds([minX, minY, maxX, maxY]) {
  const [Xmin, Ymin] = proj4('EPSG:3857', 'EPSG:3035', [minX, minY])
  const [Xmax, Ymax] = proj4('EPSG:3857', 'EPSG:3035', [maxX, maxY])
  return [Xmin, Ymin, Xmax, Ymax]
}

function tileToWebMercatorBounds(z, x, y) {
  const n = Math.pow(2, z)
  // Each tile is in the range [0, n) in both x and y direction.
  const lonMin = (x / n) * 360 - 180
  const lonMax = ((x + 1) / n) * 360 - 180
  const latMin = webMercatorToLat(
    Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
  )
  const latMax = webMercatorToLat(
    Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)))
  )

  // Convert these lat/lon to Web Mercator meters
  const [minX, minY] = lonLatToWebMerc(lonMin, latMin)
  const [maxX, maxY] = lonLatToWebMerc(lonMax, latMax)

  return [minX, minY, maxX, maxY]
}

function webMercatorToLat(mercVal) {
  // Already lat in radians after atan sinh conversion above.
  return mercVal * (180 / Math.PI)
}

function lonLatToWebMerc(lon, lat) {
  const x = (lon * 20037508.34) / 180
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)
  y = (y * 20037508.34) / 180
  return [x, y]
}

async function getGeoTIFFInfo() {
  const data = fs.readFileSync(`${import.meta.dirname}/data/baltic_sea.tif`)
  const tiff = await fromArrayBuffer(data.buffer)
  const image = await tiff.getImage()
  return image
}

function worldToPixel(x, y, originX, originY, resX, resY) {
  // For X: straightforward since resX is positive
  const px = Math.floor((x - originX) / resX)

  // For Y: since resY is negative and originY is at the top,
  // the following transforms a geographic Y into a pixel index.
  // As Y decreases down in pixels, if world Y is less than originY,
  // (originY - y) will be positive.
  const py = Math.floor((originY - y) / Math.abs(resY))

  return [px, py]
}

export async function generateElevationImage(tile) {
  const image = await getGeoTIFFInfo()
  const [x, y, z] = tile
  const width = image.getWidth()
  const height = image.getHeight()

  // GeoTIFF metadata
  const fileDirectory = image.getFileDirectory()
  const tiePoints = fileDirectory.ModelTiepoint // [pixelX, pixelY, pixelZ, Xgeo, Ygeo, Zgeo]
  const pixelScale = fileDirectory.ModelPixelScale // [resX, resY, resZ]

  const originX = tiePoints[3]
  const originY = tiePoints[4]
  const resX = pixelScale[0]
  const resY = pixelScale[1]

  // 1. Get tile bounds in EPSG:3857
  const wmBounds = tileToWebMercatorBounds(z, x, y)

  // 2. Reproject bounds to EPSG:3035
  const [Xmin, Ymin, Xmax, Ymax] = reprojectBounds(wmBounds)

  // Convert each corner to pixel coordinates
  const [pxMin, pyMin] = worldToPixel(Xmin, Ymin, originX, originY, resX, resY)
  const [pxMax, pyMax] = worldToPixel(Xmax, Ymax, originX, originY, resX, resY)

  // Ensure the window is within the image bounds
  const window = [
    Math.max(0, Math.min(pxMin, pxMax)),
    Math.max(0, Math.min(pyMin, pyMax)),
    Math.min(width, Math.max(pxMin, pxMax)),
    Math.min(height, Math.max(pyMin, pyMax)),
  ]
  const windowWidth = window[2] - window[0]
  const windowHeight = window[3] - window[1]

  // 3. Read a 100x100 pixel subset
  // readRasters can take a `window` and desired `width` and `height`
  const rasters = await image.readRasters({ window })
  const elevationData = rasters[0] // Assuming single-band elevation data

  const targetWidth = 100
  const targetHeight = 100

  const resampledData = new Float32Array(targetWidth * targetHeight)

  for (let j = 0; j < targetHeight; j++) {
    // Flip vertical axis: top of target maps to bottom of source
    const srcY = Math.floor((j / (targetHeight - 1)) * (windowHeight - 1))

    for (let i = 0; i < targetWidth; i++) {
      // Simple linear mapping for X
      const srcX = Math.floor((i / (targetWidth - 1)) * (windowWidth - 1))

      // Use standard row-major indexing
      const srcIndex = srcY * windowWidth + srcX
      resampledData[j * targetWidth + i] = elevationData[srcIndex]
    }
  }

  const validData = resampledData.filter((val) => val !== -32767)
  if (validData.length === 0) {
    console.warn('No valid data in this subset.')
    return
  }

  // 4. Convert elevation data to an image (e.g., grayscale)
  // Find min/max to scale values or just assume a known range
  const minVal = Math.min(...validData)
  const maxVal = Math.max(...validData)

  const png = new PNG({ width: 100, height: 100, colorType: 0 }) // grayscale

  for (let i = 0; i < elevationData.length; i++) {
    const val = resampledData[i]
    // Scale elevation to 0-255
    const scaled = Math.floor(((val - minVal) / (maxVal - minVal)) * 255)
    // png.data[i] = scaled
    const idx = i * 4
    png.data[idx] = scaled // R
    png.data[idx + 1] = scaled // G
    png.data[idx + 2] = scaled // B
    png.data[idx + 3] = 255 // A
  }

  // Encode PNG to a Buffer
  const buffer = PNG.sync.write(png)

  // Convert Buffer to ArrayBuffer
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )

  return arrayBuffer
}

// export const init = async () => {
//   console.log('Geotiff API initialized')
//   await generateElevationImage([6, 35, 19])
// }
