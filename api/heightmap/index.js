import fs from 'fs'
import { createNoise2D } from 'simplex-noise'
import alea from 'alea'
import {
  getPixelDataFromFile,
  writePixelsToPng,
  mergeHeightmaps,
  multiplyHeightmaps,
  rgbToHsl,
  hslDistance,
  useMask,
} from '../utils.js'
import { LANDCOVER_COLORS } from '../colors.js'
import { heightmapQueue } from '../queues.js'

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

const applyGaussianFilter = (heightmap, radius) => {
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

  const resolution = Math.sqrt(heightmap.length)
  const newHeightmap = new Float32Array(heightmap.length)

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      let value = 0
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const sampleX = x + kx
          const sampleY = y + ky

          if (
            sampleX >= 0 &&
            sampleX < resolution &&
            sampleY >= 0 &&
            sampleY < resolution
          ) {
            const sampleIndex = sampleY * resolution + sampleX
            const weight = kernel[ky + radius] * kernel[kx + radius]
            value += heightmap[sampleIndex] * weight
          }
        }
      }

      newHeightmap[y * resolution + x] = value
    }
  }

  return newHeightmap
}

const heightmapFromFile = async (heightmapFile) => {
  const [data, resolution] = await getPixelDataFromFile(heightmapFile)

  const heightmap = new Float32Array(resolution * resolution)
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      let index = (y * resolution + x) * 4
      heightmap[y * resolution + x] = data[index] / 255
    }
  }

  return [heightmap, resolution]
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

  const resolution = Math.sqrt(heightmap.length)
  await writePixelsToPng(heightMapData, resolution, path)

  return path
}

const applyNoiseMap = async (heightmap, filePath) => {
  const noisemap = createNoisemap(Math.sqrt(heightmap.length), 1.5)

  mergeHeightmaps(heightmap, noisemap, 0.1)

  if (filePath) {
    await heightMapToFile(heightmap, filePath)
  }
  return heightmap
}

const blurHeightmap = async (heightmap, blurAmount = 8, filePath) => {
  const modifiedHeightmap = applyGaussianFilter(heightmap, blurAmount)

  if (filePath) {
    await heightMapToFile(modifiedHeightmap, filePath)
  }
  return modifiedHeightmap
}

const applyMask = async (heightmap, mask) => {
  // const [heightmap, resolution] = await heightmapFromFile(heightmapFile)
  // const maskMapWithBlur = applyGaussianFilter(
  //   maskmap,
  //   RESOLUTION,
  //   mask.rules.blur
  // )

  return multiplyHeightmaps(heightmap, mask.map, mask.rules)
}

// export const upscaleTo2048 = async (tileId) => {
//   const tileFolder = `./public/tiles/${tileId}`
//   const heightmapFile = `${tileFolder}/heightmap.png`

//   const [heightmap, resolution] = await heightmapFromFile(heightmapFile)

//   const heightMapData = new Float32Array(2048 * 2048)
//   for (let i = 0; i < 2048; i++) {
//     for (let j = 0; j < 2048; j++) {
//       const x = Math.floor((i / 2048) * resolution)
//       const y = Math.floor((j / 2048) * resolution)
//       heightMapData[i * 2048 + j] = heightmap[y * resolution + x]
//     }
//   }

//   await writePixelsToPng(
//     heightMapData,
//     2048,
//     2048,
//     heightmapFile.replace('.png', '_2048.png')
//   )
// }

export const modifyHeightmap = async (tileId) => {
  const tileFolder = `./public/tiles/${tileId}`
  const heightmapFile = `${tileFolder}/heightmap.png`

  const [heightmap] = await heightmapFromFile(heightmapFile)
  const blurred = await blurHeightmap(heightmap)

  let finalpath = `${tileFolder}/heightmap_final.png`
  // extract all masks from colors
  const withNoise = await applyNoiseMap(
    blurred,
    heightmapFile.replace('.png', '_with_noise.png')
  )
  const masks = Object.keys(LANDCOVER_COLORS)
    .map((key) => ({
      ...LANDCOVER_COLORS[key],
      name: key,
    }))
    .sort((a, b) => a.order - b.order)

  let currentFile = withNoise
  for (let mask of masks) {
    const maskPath = `${tileFolder}/${mask.name}_mask.png`
    if (mask.name == 'water') {
      let [maskData, resolution] = await heightmapFromFile(maskPath)
      const noisemap = createNoisemap(resolution, 15)
      const detailNoise = createNoisemap(resolution, 1.5)
      mergeHeightmaps(noisemap, detailNoise, 0.2)
      const oceanMap = await useMask(
        noisemap,
        applyGaussianFilter(maskData, 24)
      )
      await heightMapToFile(oceanMap, `${tileFolder}/ocean_map.png`)
      continue
    } else {
      if (!mask.rules) continue
      let [maskData, resolution] = await heightmapFromFile(maskPath)
      if (mask.rules.blur) {
        maskData = applyGaussianFilter(maskData, mask.rules.blur)
      }
      mask.map = maskData
      currentFile = await applyMask(currentFile, mask)
    }
  }

  await applyNoiseMap(currentFile, finalpath)
}

heightmapQueue.process(4, async (job, done) => {
  const { tileId } = job.data

  try {
    await modifyHeightmap(tileId)
    done()
  } catch (e) {
    console.log(e)
    done(e)
  }
})
