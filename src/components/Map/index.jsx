import React, { useEffect, useRef, useState } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import { Editor, DrawRectangleMode } from 'react-map-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  mapViewportAtom,
  refreshTilesAtom,
  tilesAtom,
  useTile,
} from '../../state'
import styled from '@emotion/styled'
import {
  Card,
  Checkbox,
  ScrollArea,
  Select,
  Slider,
  Space,
  Image as ImageComponent,
  Flex,
  Text,
} from '@mantine/core'

const API_URL = import.meta.env.VITE_API_URL
const URL = import.meta.env.VITE_URL

const Container = styled.div`
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
`

const MapControlsContainer = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1;
`

const CREATE_MODE = new DrawRectangleMode()
const AREA_MODE = new DrawRectangleMode()
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const MapWrapper = ({ children, onClick, mapRef }) => {
  const [viewport, setViewport] = useAtom(mapViewportAtom)

  return (
    <Map
      {...viewport}
      ref={(ref) => (mapRef.current = ref)}
      mapLib={import('mapbox-gl')}
      mapboxApiAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
      onViewportChange={setViewport}
      width={'100%'}
      height={'100%'}
      mapStyle="mapbox://styles/mapbox/satellite-v9"
      onClick={onClick}
    >
      {children}
    </Map>
  )
}

const TileList = () => {
  const navigate = useNavigate()
  const tiles = useAtomValue(tilesAtom)

  return (
    <ScrollArea h={400}>
      <Text fz={24} fw={700}>
        Tiles - {tiles.length}
      </Text>
      <Flex direction="column" s>
        {tiles.map((tile) => (
          <Card onClick={() => navigate(`/tile/${tile.id}`)} withBorder mb={16}>
            <Flex>
              <ImageComponent
                src={tile.landcover}
                width={100}
                fallbackSrc={`${URL}/images/loading.png`}
              />
              {tile && tile.center && (
                <Flex direction="column" p={8}>
                  <Text>
                    <strong>Lat:</strong>{' '}
                    {tile.center[1].toString().slice(0, 5)}
                  </Text>
                  <Text>
                    <strong>Lng:</strong>{' '}
                    {tile.center[0].toString().slice(0, 5)}
                  </Text>
                </Flex>
              )}
            </Flex>
          </Card>
        ))}
      </Flex>
    </ScrollArea>
  )
}

const MapZoomSlider = () => {
  const [viewport, setViewport] = useAtom(mapViewportAtom)

  return (
    <>
      Zoom
      <Slider
        w={200}
        min={1}
        max={15}
        step={1}
        onChange={(value) => {
          setViewport({
            ...viewport,
            zoom: value,
          })
        }}
        value={viewport.zoom}
      />
    </>
  )
}

const MapContainer = () => {
  const navigate = useNavigate()
  const map = useRef(null)
  const [mode, setMode] = useState(null)
  const tiles = useAtomValue(tilesAtom)
  const refreshTiles = useSetAtom(refreshTilesAtom)
  const setViewPort = useSetAtom(mapViewportAtom)
  const tile = useTile()
  const [tileOpacity, setTileOpacity] = useState(0.65)
  const [islandMask, setIslandMask] = useState(false)

  const tilesLayerData = tiles.map((tile) => ({
    id: tile.id,
    type: 'image',
    url: tile.landcover
      ? `${URL}${tile.landcover}`
      : `${URL}/images/loading.png`,
    coordinates: [
      [tile.bbox[0], tile.bbox[3]],
      [tile.bbox[2], tile.bbox[3]],
      [tile.bbox[2], tile.bbox[1]],
      [tile.bbox[0], tile.bbox[1]],
    ],
  }))

  const handleMapClick = (event) => {
    const coords = event.lngLat
    const tile = tiles.find(
      (tile) =>
        coords[0] > tile.bbox[0] &&
        coords[0] < tile.bbox[2] &&
        coords[1] > tile.bbox[1] &&
        coords[1] < tile.bbox[3]
    )

    if (tile) {
      navigate(`/tile/${tile.id}`)
    }
  }

  const onDraw = async (e) => {
    if (!mode) return
    if (e.editType === 'addFeature') {
      const mapInstance = map.current.getMap()
      // get currentZoom
      const currentZoom = Math.round(mapInstance.getZoom())
      const coords = e.data[0].geometry.coordinates[0]

      if (mode == CREATE_MODE) {
        const response = await axios.post(`${API_URL}/tile`, {
          coords,
          zoom: currentZoom,
          islandMask,
        })
        const tile = response.data
      } else if (mode == AREA_MODE) {
        const response = await axios.post(`${API_URL}/area`, {
          coords,
          zoom: currentZoom,
        })
        alert('Area creation queued')
      }

      if (tile) {
        refreshTiles()
        await wait(500)
        navigate(`/tile/${tile.id}`)
      }
    }
  }

  useEffect(() => {
    if (!map.current || !tile) return
    const mapInstance = map.current.getMap()
    const diff = tile.center[0] - tile.bbox[0]
    const offsetCenter = [tile.center[0] + diff * 2.25, tile.center[1]]
    const tileChildrenZoom = tile.tiles.map((t) => t.tile[2])
    const minZoom = Math.min(...tileChildrenZoom)
    mapInstance.flyTo({
      center: offsetCenter,
      zoom: minZoom - 1,
    })
  }, [tile, map.current])

  useEffect(() => {
    if (!map.current) return
    const mapInstance = map.current.getMap()
    mapInstance.showTileBoundaries = mode == CREATE_MODE || mode == AREA_MODE
    if (mode == AREA_MODE) {
      setViewPort((s) => ({
        ...s,
        zoom: 9,
      }))
      mapInstance.flyTo({
        zoom: 9,
      })
    }
  }, [map.current, mode])

  return (
    <Container>
      <MapWrapper mapRef={map} onClick={handleMapClick}>
        {tilesLayerData.map((data) => (
          <Source {...data} key={`Tile_${data.id}`}>
            <Layer
              id={`${data.id}_layer`}
              type="raster"
              source={data.id}
              paint={{
                'raster-opacity': tileOpacity,
              }}
            />
          </Source>
        ))}
        <Editor
          // to make the lines/vertices easier to interact with
          clickRadius={12}
          mode={mode}
          onUpdate={onDraw}
          features={[]}
        />
      </MapWrapper>
      <MapControlsContainer>
        <Card w={300}>
          Tile opacity
          <Slider
            w={200}
            min={0}
            max={1}
            step={0.05}
            onChange={setTileOpacity}
            value={tileOpacity}
          />
          <MapZoomSlider />
          <Select
            label="Mode"
            data={[
              { value: null, label: 'View' },
              { value: CREATE_MODE, label: 'Create' },
              { value: AREA_MODE, label: 'Area' },
            ]}
            onChange={(value) => setMode(value)}
            value={mode}
            dropdownPosition="bottom"
          />
          <Space h="md" />
          {mode === CREATE_MODE && (
            <Checkbox
              label="Mask out island"
              checked={islandMask}
              onChange={(e) => setIslandMask(e.target.checked)}
            />
          )}
          {!mode && <TileList />}
        </Card>
      </MapControlsContainer>
    </Container>
  )
}

export default MapContainer
