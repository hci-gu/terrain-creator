import { Button, ColorPicker, Flex, Slider, Space, Text } from '@mantine/core'
import { useEffect } from 'react'
import { useState } from 'react'

const MapColorPicker = ({
  title,
  palette,
  coverageFunction = () => {},
  onColorChange = () => {},
  onRadiusChange = () => {},
  onSave = () => {},
  onDelete = () => {},
  disabled = false,
}) => {
  const [value, onChange] = useState(palette[0].color)
  const [brushRadius, setBrushRadius] = useState(10)

  useEffect(() => {
    onColorChange(value)
  }, [value])

  useEffect(() => {
    onRadiusChange(brushRadius)
  }, [brushRadius])

  return (
    <Flex
      direction="column"
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'all',
      }}
    >
      <Flex direction="column">
        <Text fz={24} fw={700} lh={0.8}>
          {title}
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
          swatches={palette.map((color) => color.color)}
          swatchesPerRow={1}
        />
        <Flex direction="column" mt={6}>
          {palette.map((color) => (
            <Flex key={`Color_${color.name}`} direction="column" mt={0} ml={4}>
              <Text fz={15} fw={600}>
                {color.name}
              </Text>
              <Text fz={12} fw={300}>
                {coverageFunction(color)}%
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

      <Space h="md" />
      <Flex gap="md">
        <Button onClick={onSave}>Save</Button>
        <Button color="red" onClick={onDelete}>
          Reset
        </Button>
      </Flex>
    </Flex>
  )
}

export default MapColorPicker
