import { Button, ColorPicker, Flex, Slider, Space, Text } from '@mantine/core'
import { useRef, useState } from 'react'
import CanvasDraw from 'react-canvas-draw'
import { useTile, landcovers } from '../state'

const colorNameToKey = (name) => name.toLowerCase().replace(' ', '_')
const coverageForColor = (tile, color) => {
  const value = tile.coverage[colorNameToKey(color.name)]

  if (value === undefined) {
    return 0
  }
  return (value * 100).toFixed(2)
}

const DrawTools = ({ imgSrc, loading, onSave, onDelete }) => {
  const tile = useTile()
  const [value, onChange] = useState(landcovers[0].color)
  const [brushRadius, setBrushRadius] = useState(10)

  const ref = useRef()
  return (
    <>
      <Flex>
        <CanvasDraw
          //   style={{ transform: 'scale(0.5)', 'transform-origin': '0 0' }}
          ref={ref}
          imgSrc={imgSrc}
          brushColor={value}
          brushRadius={brushRadius}
          lazyRadius={0}
          canvasWidth={512}
          canvasHeight={512}
          enablePanAndZoom
        />
        <Space w="md" />
        <Flex direction="column">
          <Text fz={24} fw={700}>
            Landcovers
          </Text>
          <Flex>
            <ColorPicker
              w={32}
              format="hex"
              value={value}
              onChange={onChange}
              withPicker={false}
              swatches={landcovers.map((color) => color.color)}
              swatchesPerRow={1}
            />
            <Flex direction="column">
              {landcovers.map((color) => (
                <Text mt={10} ml={8}>
                  {color.name} - {coverageForColor(tile, color)}%
                </Text>
              ))}
            </Flex>

            <Space w="md" />
          </Flex>
          <Space h="md" />
          <Text fz={16} fw={700}>
            Brush Size
          </Text>
          <Slider
            value={brushRadius}
            onChange={(value) => setBrushRadius(value)}
            step={1}
            min={2}
            max={100}
          />
        </Flex>
      </Flex>
      <Space h="md" />
      <Flex gap="md">
        <Button loading={loading} onClick={() => onSave(ref.current)}>
          Save
        </Button>
        <Button color="red" loading={loading} onClick={() => onDelete()}>
          Reset
        </Button>
      </Flex>
    </>
  )
}

export default DrawTools
