import {
  Button,
  ColorPicker,
  Flex,
  SegmentedControl,
  Slider,
  Space,
  Text,
} from '@mantine/core'
import { useRef, useState } from 'react'
import CanvasDraw from 'react-canvas-draw'
import { landcovers } from '../../state'
import MapColorPicker from './MapColorPicker'
import MapData from './MapData'
import * as pocketbase from '../../pocketbase'
import { convertDataUrlToBlob, imageFromCanvas } from '../../utils'

const colorNameToKey = (name) => name.toLowerCase().replace(' ', '_')
const coverageForColor = (tile, color) => {
  const value = tile.landcover.coverage[colorNameToKey(color.name)]

  if (value === undefined) {
    return 0
  }
  return value.toFixed(2)
}

const LandData = ({ tile }) => {
  const editableCanvasRef = useRef()
  const [color, setColor] = useState(landcovers[0].color)
  const [brushRadius, setBrushRadius] = useState(10)

  const onSave = async () => {
    const image = await imageFromCanvas(editableCanvasRef.current)
    const file = new File([convertDataUrlToBlob(image)], 'landcover.png', {
      type: 'image/png',
    })
    pocketbase.updateLandCover(tile.landcover.id, file)
  }

  const onDelete = async () => {
    editableCanvasRef.current.eraseAll()
    pocketbase.updateLandCover(tile.landcover.id, null)
  }

  const mapProps = {
    landcover: {
      imageSrc: tile.landcover.url_small,
      editable: true,
    },
    heightmap: {
      imageSrc: tile.heightmap.url,
    },
    satellite: {
      imageSrc: tile.satellite,
    },
  }

  const maps = [
    {
      label: 'Landcover',
      value: 'landcover',
    },
    {
      label: 'Heightmap',
      value: 'heightmap',
    },
    {
      label: 'Satellite',
      value: 'satellite',
    },
  ]
  const [selectedMap, setSelectedMap] = useState(maps[0].value)

  return (
    <Flex direction="column">
      <Flex>
        <Flex direction="column">
          <MapData
            {...mapProps[selectedMap]}
            editableCanvasRef={editableCanvasRef}
            tile={tile}
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
          palette={landcovers}
          title="Landcover"
          coverageFunction={(color) => coverageForColor(tile, color)}
          onColorChange={setColor}
          onRadiusChange={setBrushRadius}
          onSave={onSave}
          onDelete={onDelete}
        />
      </Flex>
      <Space h="md" />
    </Flex>
  )
}

export default LandData
