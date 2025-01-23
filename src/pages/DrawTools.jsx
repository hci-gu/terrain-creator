import { Button, ColorPicker, Flex, Slider, Space, Text } from '@mantine/core'
import { useRef, useState } from 'react'
import CanvasDraw from 'react-canvas-draw'
import { landcovers } from '../state'

const colorNameToKey = (name) => name.toLowerCase().replace(' ', '_')
const coverageForColor = (tile, color) => {
  const value = tile.landcover.coverage[colorNameToKey(color.name)]

  if (value === undefined) {
    return 0
  }
  return value.toFixed(2)
}

const DrawTools = ({ imgSrc, tile, loading, onSave, onDelete }) => {
  const [value, onChange] = useState(landcovers[0].color)
  const [brushRadius, setBrushRadius] = useState(10)

  const ref = useRef()
  return (
    <Flex direction="column">
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
          <Flex direction="column">
            <Text fz={24} fw={700} lh={0.8}>
              Landcovers
            </Text>
            <Text fz={16} fw={300}>
              Percent Coverage
            </Text>
          </Flex>
          <Flex>
            <ColorPicker
              w={39}
              format="hex"
              value={value}
              onChange={onChange}
              withPicker={false}
              swatches={landcovers.map((color) => color.color)}
              swatchesPerRow={1}
            />
            <Flex direction="column" mt={6}>
              {landcovers.map((color) => (
                <Flex
                  key={`Color_${color.name}`}
                  direction="column"
                  mt={0}
                  ml={4}
                >
                  <Text fz={15} fw={600}>
                    {color.name}
                  </Text>
                  <Text fz={12} fw={300}>
                    {coverageForColor(tile, color)}%
                  </Text>
                </Flex>
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
        <Button
          color="red"
          loading={loading}
          onClick={() => {
            ref.current.eraseAll()
            onDelete()
          }}
        >
          Reset
        </Button>
      </Flex>
    </Flex>
  )
}

export default DrawTools
