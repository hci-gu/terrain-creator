import React, { startTransition, useEffect, useRef, useState } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  CREATE_MODE,
  VIEW_MODE,
  mapBoundsAtom,
  mapModeAtom,
  mapViewportAtom,
  tileAtom,
  tilesAtom,
  mapDrawModeAtom,
} from '../../state'
import styled from '@emotion/styled'
import {
  Card,
  ScrollArea,
  Slider,
  Space,
  Image as ImageComponent,
  Flex,
  Text,
} from '@mantine/core'
import GeocoderControl from './Geocoder'
import DrawControl from './DrawControl'
import { useParams } from 'react-router-dom'
import CreateTiles from './CreateTiles'

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const boundsEqual = (a, b) => {
  return (
    a._sw.lat == b._sw.lat &&
    a._sw.lng == b._sw.lng &&
    a._ne.lat == b._ne.lat &&
    a._ne.lng == b._ne.lng
  )
}

const MapWrapper = ({ children, onClick, mapRef }) => {
  const [initialLoad, setInitialLoad] = useState(false)
  const drawMode = useAtomValue(mapDrawModeAtom)
  const setBounds = useSetAtom(mapBoundsAtom)
  const viewport = useAtomValue(mapViewportAtom)
  
  // Disable dragging when in drawing mode
  const isDrawing = drawMode === 'draw_polygon'

  useEffect(() => {
    if (!mapRef.current) return

    let prevBounds = null
    let interval = setInterval(() => {
      const bounds = mapRef.current.getMap().getBounds()
      if (prevBounds && boundsEqual(bounds, prevBounds)) {
        return
      }
      prevBounds = bounds
      setBounds(bounds)
    }, 600)

    return () => clearInterval(interval)
  }, [initialLoad, mapRef.current])

  return (
    <Map
      // {...viewport}
      initialViewState={viewport}
      ref={(ref) => {
        mapRef.current = ref
        setTimeout(() => setInitialLoad(true), 250)
      }}
      mapLib={import('mapbox-gl')}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
      // onViewportChange={setViewport}
      style={{
        width: '100%',
        height: '100%',
      }}
      scrollZoom={!isDrawing}
      doubleClickZoom={!isDrawing}
      dragPan={!isDrawing}
      dragRotate={!isDrawing}
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
      <Flex direction="column">
        {tiles.map((tile) => (
          <Card
            onClick={() => navigate(`/tile/${tile.id}`)}
            withBorder
            mb={16}
            key={`TileListItem_${tile.id}`}
          >
            <Flex>
              <ImageComponent src={tile.landcover.url} width={100} />
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

const MapContainer = () => {
  const navigate = useNavigate()
  const map = useRef(null)
  const mapMode = useAtomValue(mapModeAtom)
  const tiles = useAtomValue(tilesAtom)
  const { id } = useParams()
  const tile = useAtomValue(tileAtom(id))
  const [tileOpacity, setTileOpacity] = useState(0.65)
  // const [islandMask, setIslandMask] = useState(false)

  const tilesLayerData = tiles.map((tile) => ({
    id: tile.id,
    type: 'image',
    url: tile.landcover.url,
    coordinates: [
      [tile.bbox[0], tile.bbox[3]],
      [tile.bbox[2], tile.bbox[3]],
      [tile.bbox[2], tile.bbox[1]],
      [tile.bbox[0], tile.bbox[1]],
    ],
  }))

  const handleMapClick = (event) => {
    const coords = [event.lngLat.lng, event.lngLat.lat]
    const tile = tiles.find(
      (tile) =>
        coords[0] > tile.bbox[0] &&
        coords[0] < tile.bbox[2] &&
        coords[1] > tile.bbox[1] &&
        coords[1] < tile.bbox[3]
    )

    if (tile) {
      startTransition(() => navigate(`/tile/${tile.id}`))
    }
  }

  useEffect(() => {
    if (!map.current || !tile) return
    const mapInstance = map.current.getMap()
    const diff = tile.center[0] - tile.bbox[0]
    const offsetCenter = [tile.center[0] + diff * 2.25, tile.center[1]]
    mapInstance.flyTo({
      center: offsetCenter,
    })
  }, [tile, map.current])

  return (
    <Container>
      <MapWrapper mapRef={map} onClick={mapMode !== CREATE_MODE ? handleMapClick : undefined}>
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
        <GeocoderControl position="top-left" />
        <DrawControl
          mapRef={map}
          position="top-left"
          displayControlsDefault={false}
          controls={{
            polygon: true,
            trash: true,
            // point: true,
          }}
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
          <Space h="md" />
          {/* {mode === CREATE_MODE && (
            <Checkbox
              label="Mask out island"
              checked={islandMask}
              onChange={(e) => setIslandMask(e.target.checked)}
            />
          )} */}
          {mapMode == CREATE_MODE && <CreateTiles mapRef={map} />}
          {mapMode == CREATE_MODE && <Space h="md" />}
          <TileList />
        </Card>
      </MapControlsContainer>
    </Container>
  )
}

export default MapContainer
