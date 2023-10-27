import fs from 'fs'
import { createNoise2D } from 'simplex-noise'
import alea from 'alea'
import {
  getPixelDataFromFile,
  writePixelsToPng,
  mergeHeightmaps,
  multiplyHeightmaps,
  convertPngToRaw16Bit,
} from '../utils.js'
import { LANDCOVER_COLORS } from '../colors.js'
const RESOLUTION = 1024

const createNoisemap = (resolution, scale) => {
  const octaves = 4
  const persistance = 0.33
  const lacunarity = 2.4

  const prng = alea(Math.floor(Math.random() * 10000000))
  const noise2D = createNoise2D(prng)
  const map = new Float32Array(resolution * resolution)

  let minHeight = Infinity
  let maxHeight = -Infinity
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x = (i / resolution) * scale
      const y = (j / resolution) * scale
      let amplitude = 1
      let frequency = 1
      let value = 0

      for (let o = 0; o < octaves; o++) {
        // noise2D returns a value between -1 and 1, remap to [0, 1]
        value += ((noise2D(x * frequency, y * frequency) + 1) / 2) * amplitude

        amplitude *= persistance
        frequency *= lacunarity
      }

      minHeight = Math.min(minHeight, value)
      maxHeight = Math.max(maxHeight, value)

      map[i * resolution + j] = value
    }
  }

  // normalize the map to [0, 1]
  for (let i = 0; i < resolution * resolution; i++) {
    map[i] = (map[i] - minHeight) / (maxHeight - minHeight)
  }

  return map
}

const applyGaussianFilter = (heightmap, size, radius) => {
  const kernel = []
  const kernelSize = radius * 2 + 1
  const sigma = radius / 3
  const sigma2 = 2 * sigma * sigma
  let total = 0

  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius
    const g =
      (1 / Math.sqrt(2 * Math.PI * sigma2)) * Math.exp(-(x * x) / sigma2)
    kernel.push(g)
    total += g
  }

  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= total
  }

  const newHeightmap = new Float32Array(size * size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value = 0
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const sampleX = x + kx
          const sampleY = y + ky

          if (
            sampleX >= 0 &&
            sampleX < size &&
            sampleY >= 0 &&
            sampleY < size
          ) {
            const sampleIndex = sampleY * size + sampleX
            const weight = kernel[ky + radius] * kernel[kx + radius]
            value += heightmap[sampleIndex] * weight
          }
        }
      }

      newHeightmap[y * size + x] = value
    }
  }

  return newHeightmap
}

const heightmapFromFile = async (heightmapFile) => {
  const data = await getPixelDataFromFile(heightmapFile)

  const heightmap = new Float32Array(RESOLUTION * RESOLUTION)
  for (let y = 0; y < RESOLUTION; y++) {
    for (let x = 0; x < RESOLUTION; x++) {
      let index = (y * RESOLUTION + x) * 4
      heightmap[y * RESOLUTION + x] = data[index] / 255
    }
  }

  return heightmap
}

const euclideanDistance = (color1, color2) => {
  let sum = 0
  for (let i = 0; i < 3; i++) {
    sum += Math.pow(color1[i] - color2[i], 2)
  }
  return Math.sqrt(sum)
}

const extractHeightmapFromFileAndColor = async (heightmapFile, color) => {
  const data = await getPixelDataFromFile(heightmapFile)
  const thresholdDistance = 255 * Math.sqrt(3) * 0.05

  const heightmap = new Float32Array(RESOLUTION * RESOLUTION)
  for (let y = 0; y < RESOLUTION; y++) {
    for (let x = 0; x < RESOLUTION; x++) {
      let index = (y * RESOLUTION + x) * 4
      let distance = euclideanDistance(
        [data[index], data[index + 1], data[index + 2]],
        color
      )
      if (distance <= thresholdDistance) {
        heightmap[y * RESOLUTION + x] = 1
      } else {
        heightmap[y * RESOLUTION + x] = 0
      }
    }
  }

  return heightmap
}

const heightMapToFile = async (heightmap, path) => {
  // write back heightmap to file
  const heightMapData = new Float32Array(heightmap.length * 4)
  for (let i = 0; i < heightmap.length; i++) {
    const height = heightmap[i]
    const color = Math.round(height * 255)
    heightMapData[i * 4] = color
    heightMapData[i * 4 + 1] = color
    heightMapData[i * 4 + 2] = color
    heightMapData[i * 4 + 3] = 255
  }

  await writePixelsToPng(heightMapData, RESOLUTION, RESOLUTION, path)

  return path
}

const applyNoiseMap = async (heightmapFile, outFile) => {
  const heightmap = await heightmapFromFile(heightmapFile)

  const noisemap = createNoisemap(RESOLUTION, 1.5)

  mergeHeightmaps(heightmap, noisemap, 0.1)

  return heightMapToFile(
    heightmap,
    outFile ? outFile : heightmapFile.replace('.png', '_with_noise.png')
  )
}

const blurHeightmap = async (heightmapFile) => {
  const heightmap = await heightmapFromFile(heightmapFile)

  const modifiedHeightmap = applyGaussianFilter(heightmap, RESOLUTION, 16)

  return heightMapToFile(
    modifiedHeightmap,
    heightmapFile.replace('.png', '_with_blur.png')
  )
}

const applyMask = async (heightmapFile, mask) => {
  const heightmap = await heightmapFromFile(heightmapFile)
  const maskmap = await heightmapFromFile(mask.file)
  // const maskMapWithBlur = applyGaussianFilter(
  //   maskmap,
  //   RESOLUTION,
  //   mask.rules.blur
  // )

  const modifiedHeightmap = multiplyHeightmaps(heightmap, maskmap, mask.rules)

  return heightMapToFile(
    modifiedHeightmap,
    heightmapFile.replace('.png', `_${mask.name}.png`)
  )
}

export const modifyHeightmap = async (tileId) => {
  const tileFolder = `./public/tiles/${tileId}`
  const heightmapFile = `${tileFolder}/heightmap.png`

  const blurred = await blurHeightmap(heightmapFile)

  const withNoise = await applyNoiseMap(blurred)

  // check if file exists
  let filepath = `${tileFolder}/landcover_colors_edited.png`
  if (!fs.existsSync(filepath)) {
    filepath = `${tileFolder}/landcover_colors.png`
  }

  // extract all masks from colors
  const masks = Object.keys(LANDCOVER_COLORS)
    .map((key) => ({
      ...LANDCOVER_COLORS[key],
      name: key,
    }))
    .sort((a, b) => a.order - b.order)

  let currentFile = withNoise
  for (let mask of masks) {
    let maskData = await extractHeightmapFromFileAndColor(filepath, mask.paint)
    if (mask.rules) {
      maskData = applyGaussianFilter(maskData, RESOLUTION, mask.rules.blur)
    }
    mask.file = `${tileFolder}/${mask.name}_mask.png`
    await heightMapToFile(maskData, mask.file)
    if (mask.rules) {
      currentFile = await applyMask(currentFile, mask)
    }
  }

  let finalpath = `${tileFolder}/heightmap_final.png`
  await applyNoiseMap(currentFile, finalpath)

  // save a copy as .raw
  await convertPngToRaw16Bit(finalpath, finalpath.replace('.png', '.raw'))
}
