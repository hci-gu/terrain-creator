import React, { useEffect, useState } from 'react'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import axios from 'axios'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  CREATE_MODE,
  featuresAtom,
  mapDrawModeAtom,
  mapModeAtom,
} from '../../state'
import { Checkbox, Space, Flex, Text, Button } from '@mantine/core'
import * as pocketbase from '../../../lib/pocketbase'

const CreateTiles = ({ mapRef }) => {
  const [includeLandcover, setIncludeLandcover] = useState(true)
  const [includeHeightmap, setIncludeHeightmap] = useState(true)
  const [highResMode, setHighResMode] = useState(false)

  const mapMode = useAtomValue(mapModeAtom)
  const drawMode = useAtomValue(mapDrawModeAtom)
  const [features, setFeatures] = useAtom(featuresAtom)

  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.getMap().showTileBoundaries = mapMode == CREATE_MODE
    if (mapMode == CREATE_MODE) {
      // set zoom to 12, animate it
      mapRef.current.getMap().setZoom(highResMode ? 13 : 11)
    }
  }, [mapRef, highResMode, drawMode])

  const onClick = async () => {
    if (!Object.keys(features).length || !mapRef.current) return

    const feature = Object.values(features)[0]
    const mapInstance = mapRef.current.getMap()
    const currentZoom = Math.round(mapInstance.getZoom())

    console.log({
      coords: feature.geometry.coordinates[0],
      zoom: currentZoom,
    })

    pocketbase.createTiles({
      coords: feature.geometry.coordinates[0],
      zoom: currentZoom,
    })

    // await axios.post(`${API_URL}/area`, {
    //   coords: feature.geometry.coordinates[0],
    //   zoom: currentZoom,
    //   createHeightMap: includeHeightmap,
    //   createLandcover: includeLandcover,
    // })
    // await wait(1000)
  }

  const onClear = () => {
    setFeatures({})
  }

  const hasFeatures = Object.keys(features).length > 0

  const title = drawMode === 'draw_polygon' ? 'Create tiles' : 'Create tiles'
  const description =
    drawMode === 'draw_polygon'
      ? 'Draw a shape to create tiles for it'
      : 'Select a tile to create it'

  return (
    <Flex direction="column">
      <Text fz={24} fw={700}>
        {title}
      </Text>
      <Text>{description}</Text>
      <Space h="sm" />
      <Flex align="center">
        <Checkbox
          checked={includeLandcover}
          onChange={() => setIncludeLandcover((v) => !v)}
        />
        <Space w="sm" />
        <Text fw={500}>Create landcover</Text>
      </Flex>
      <Space h="sm" />
      <Flex align="center">
        <Checkbox
          checked={includeHeightmap}
          onChange={() => setIncludeHeightmap((v) => !v)}
        />
        <Space w="sm" />
        <Text fw={500}>Create heightmap</Text>
      </Flex>
      <Space h="sm" />
      <Flex align="center">
        <Checkbox
          checked={highResMode}
          onChange={() => setHighResMode((v) => !v)}
        />
        <Space w="sm" />
        <Text fw={500}>High res mode</Text>
      </Flex>
      <Space h="md" />
      <Button onClick={onClick} disabled={!hasFeatures}>
        Create
      </Button>
      <Space h="md" />
      <Button onClick={onClear} disabled={!hasFeatures} variant="outline">
        Clear
      </Button>
    </Flex>
  )
}

export default CreateTiles
