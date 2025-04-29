import { Flex, SegmentedControl, Space } from '@mantine/core'
import { oceancovers, rgbForLandcoverType, rgbForOceanType } from '../../state'
import { useState } from 'react'
import MapData from './MapData'
import MapColorPicker from './MapColorPicker'
import { useRef } from 'react'

function processOceanDepth(canvas, img, scale = 512) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const landRGB = rgbForLandcoverType('Grass')
  const sandRGB = rgbForOceanType('Sand')
  ctx.imageSmoothingEnabled = false

  // Draw the depth map to an offscreen canvas.
  const offCanvas = document.createElement('canvas')
  offCanvas.width = scale
  offCanvas.height = scale
  const offCtx = offCanvas.getContext('2d')
  offCtx.imageSmoothingEnabled = false
  offCtx.drawImage(img, 0, 0, scale, scale)

  // Get the depth image data.
  const depthImageData = offCtx.getImageData(0, 0, scale, scale)
  const depthData = depthImageData.data

  // Create new ImageData for our output.
  const finalImageData = ctx.createImageData(scale, scale)
  const finalData = finalImageData.data

  // Set up parameters.
  const width = scale
  const height = scale
  const pixelCount = width * height
  // Mark pixels as "land" if they belong to a connected region
  // of pixels with value 177 that is at least this large.
  const landThreshold = 100

  // Arrays to track flood-fill.
  const isLand = new Array(pixelCount).fill(false)
  const visited = new Array(pixelCount).fill(false)

  // Helper: convert (x, y) into a single index.
  const getIndex = (x, y) => y * width + x

  // Flood-fill function (4-connected neighbors).
  const floodFill = (startX, startY) => {
    const stack = [[startX, startY]]
    const component = []
    while (stack.length) {
      const [x, y] = stack.pop()
      const idx = getIndex(x, y)
      if (visited[idx]) continue
      visited[idx] = true
      // Check the red channel (grayscale assumed)
      if (depthData[idx * 4] === 177) {
        component.push([x, y])
        if (x > 0) stack.push([x - 1, y])
        if (x < width - 1) stack.push([x + 1, y])
        if (y > 0) stack.push([x, y - 1])
        if (y < height - 1) stack.push([x, y + 1])
      }
    }
    return component
  }

  // Identify connected components of value 177.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIndex(x, y)
      if (!visited[idx] && depthData[idx * 4] === 177) {
        const component = floodFill(x, y)
        if (component.length >= landThreshold) {
          component.forEach(([cx, cy]) => {
            isLand[getIndex(cx, cy)] = true
          })
        }
      }
    }
  }

  // Process each pixel and determine final color.
  // Ocean interpolation:
  // Deep water (low depth value): extremely dark blue [0, 0, 50]
  // Shallow water (high depth value): vibrant blue [0, 120, 255]
  const deepRGB = [0, 0, 75]
  const shallowRGB = rgbForLandcoverType('Water')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIndex(x, y)
      const dataIdx = idx * 4
      const depthValue = depthData[dataIdx]

      let r, g, b

      // If the pixel is 177 and part of a connected landmass, color it with the land color.
      if (depthValue === 177 && isLand[idx]) {
        r = landRGB[0]
        g = landRGB[1]
        b = landRGB[2]
      } else if (depthValue > 236) {
        r = sandRGB[0]
        g = sandRGB[1]
        b = sandRGB[2]
      } else {
        // Normalize depth: low (0) = deep water, high (255) = shallow water.
        const factor = Math.min(depthValue / 254, 1)
        r = Math.round(deepRGB[0] + factor * (shallowRGB[0] - deepRGB[0]))
        g = Math.round(deepRGB[1] + factor * (shallowRGB[1] - deepRGB[1]))
        b = Math.round(deepRGB[2] + factor * (shallowRGB[2] - deepRGB[2]))
      }

      finalData[dataIdx] = r
      finalData[dataIdx + 1] = g
      finalData[dataIdx + 2] = b
      finalData[dataIdx + 3] = 255 // Fully opaque.
    }
  }

  ctx.putImageData(finalImageData, 0, 0)
}

const OceanData = ({ oceanData }) => {
  const editableCanvasRef = useRef()
  const [color, setColor] = useState(oceancovers[0].color)
  const [brushRadius, setBrushRadius] = useState(10)
  if (!oceanData) return null

  const mapProps = {
    'ocean-floor': {
      imageSrc: oceanData.depth_url,
      editable: true,
      processFunction: processOceanDepth,
    },
    depth: {
      imageSrc: oceanData.depth_url,
    },
    temperature: {
      imageSrc: oceanData.temperature_url,
    },
    velocity: {
      imageSrc: oceanData.velocity_url,
    },
  }

  const maps = [
    {
      label: 'Ocean floor',
      value: 'ocean-floor',
    },
    {
      label: 'Depth',
      value: 'depth',
    },
    {
      label: 'Temperature',
      value: 'temperature',
    },
    {
      label: 'Velocity',
      value: 'velocity',
    },
  ]
  const [selectedMap, setSelectedMap] = useState(maps[0].value)

  return (
    <Flex direction="column">
      <Flex>
        <Flex direction="column">
          <MapData
            key={selectedMap}
            {...mapProps[selectedMap]}
            editableCanvasRef={editableCanvasRef}
            color={color}
            brushRadius={brushRadius}
          />
          <Space h="xs" />
          <SegmentedControl
            value={selectedMap}
            onChange={setSelectedMap}
            data={maps}
          />
        </Flex>
        <Space w="md" />
        <MapColorPicker
          palette={oceancovers}
          title="Ocean floor features"
          coverageFunction={(color) => 0}
          onColorChange={setColor}
          onRadiusChange={setBrushRadius}
          disabled={!mapProps[selectedMap].editable}
        />

        {/* <CanvasDraw
          ref={canvasRef}
          style={{ border: '1px solid #ccc', display: 'block' }}
          brushColor={value}
          lazyRadius={0}
          canvasWidth={512}
          canvasHeight={512}
          enablePanAndZoom
        /> */}
        <Space w="md" />
      </Flex>
    </Flex>
  )
}

export default OceanData
