import React, { useRef, useState } from 'react'
import {
  Text,
  Flex,
  Button,
  ColorPicker,
  Slider,
  Group,
  Stack,
} from '@mantine/core'
import CanvasDraw from 'react-canvas-draw'
import {
  getTileAtom,
  landcoverTypes,
} from '@state'
import * as pocketbase from '@pocketbase'
import {useAtomValue} from 'jotai'
import TileCoverInfo from '@components/TileCoverInfo'
import imageFromCanvas from '@utils/imageFromCanvas'
import convertDataUrlToBlob from '@utils/convertDataUrlToBlob'

const TileLandcoverDrawingEditor = ({ tile_id }) => {
  const [landCoverType, setLandCoverType] = useState(landcoverTypes[0])
  const [brushRadius, setBrushRadius] = useState(10)
  const tile = useAtomValue(getTileAtom(tile_id))
  const canvasRef = useRef()

  const coverageForLandcover = (landcover) => {
    const value = tile.landcover.coverage[landcover.key]

    if (value === undefined) {
      return 0
    }
    return value.toFixed(2)
  }

  const handleSave = async (canvasInstance) => {
    const image = await imageFromCanvas(canvasInstance)
    const file = new File([convertDataUrlToBlob(image)], 'landcover.png', {
      type: 'image/png',
    })
    pocketbase.updateLandCover(tile.landcover.id, file)
  }

  const handleDelete = async () => {
    pocketbase.updateLandCover(tile.landcover.id, null)
  }

  if (!tile) return null
  return (
    <Stack>
      <Flex direction="row">
        <CanvasDraw
          ref={canvasRef}
          imgSrc={tile.landcover.url}
          brushColor={landCoverType.color}
          brushRadius={brushRadius}
          lazyRadius={0}
          canvasWidth={512}
          canvasHeight={512}
          enablePanAndZoom
        />
        <Flex direction="column" ml="md" mr="md">
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
              value={landCoverType.color}
              onChange={(color) => {
                const landcover = landcoverTypes.find(
                  (landcover) => landcover.color === color
                )
                setLandCoverType(landcover)
              }}
              withPicker={false}
              swatches={landcoverTypes.map((landcover) => landcover.color)}
              swatchesPerRow={1}
            />
            <Flex direction="column" mt={6}>
              {landcoverTypes.map((landcover) => (
                <Flex
                  key={`Color_${landcover.name}`}
                  direction="column"
                  mt={0}
                  ml={4}
                >
                  <Text fz={15} fw={600}>
                    {landcover.name}
                  </Text>
                  <Text fz={12} fw={300}>
                    {coverageForLandcover(landcover)}%
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Flex>

          <Flex direction="column" mt="auto" mb="md">
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
            <Group gap="md" mt="md" mb="md">
              <Button onClick={() => handleSave(canvasRef.current)}>Save</Button>
              <Button
                color="red"
                onClick={() => {
                  canvasRef.current.eraseAll()
                  handleDelete()
                }}
              >
                Reset
              </Button>
            </Group>
          </Flex>
        </Flex>
      </Flex>
      <TileCoverInfo tile={tile} />
    </Stack>
  )
}

export default TileLandcoverDrawingEditor
