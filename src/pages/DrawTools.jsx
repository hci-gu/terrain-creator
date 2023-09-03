import { Button, ColorPicker, Flex, Slider, Space, Text } from '@mantine/core'
import { useRef, useState } from 'react'
import CanvasDraw from 'react-canvas-draw'

const availableColors = [
  {
    color: '#8ac5ff',
    name: 'Ocean',
  },
  {
    color: '#fed766',
    name: 'Sand',
  },
  {
    color: '#285330',
    name: 'Forest',
  },
  {
    color: '#79ab5f',
    name: 'Grass',
  },
  {
    color: '#5e6572',
    name: 'Rock',
  },
]

const DrawTools = ({ imgSrc, onSave }) => {
  const [value, onChange] = useState(availableColors[0].color)
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
              swatches={availableColors.map((color) => color.color)}
              swatchesPerRow={1}
            />
            <Flex direction="column">
              {availableColors.map((color) => (
                <Text mt={10} ml={8}>
                  {color.name}
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
      <Button onClick={() => onSave(ref.current)}>Save</Button>
    </>
  )
}

export default DrawTools
