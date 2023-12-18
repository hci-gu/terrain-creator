import React, { useCallback, useEffect, useRef, useState } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  CREATE_MODE,
  VIEW_MODE,
  featuresAtom,
  mapBoundsAtom,
  mapDrawModeAtom,
  mapModeAtom,
  mapTilesAtom,
  mapViewportAtom,
  refreshTilesAtom,
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
  Button,
} from '@mantine/core'
import GeocoderControl from './Geocoder'
import DrawControl from './DrawControl'
import { map, set } from 'lodash'

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
  const mapMode = useAtomValue(mapModeAtom)
  const setBounds = useSetAtom(mapBoundsAtom)
  const [viewport, setViewport] = useAtom(mapViewportAtom)

  useEffect(() => {
    console.log('useEffect', initialLoad, mapRef.current)
    if (!mapRef.current) return
    console.log('hello?')

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
      scrollZoom={mapMode != CREATE_MODE}
      doubleClickZoom={mapMode != CREATE_MODE}
      mapStyle="mapbox://styles/mapbox/satellite-v9"
      onClick={onClick}
    >
      {children}
    </Map>
  )
}

const TileList = () => {
  const navigate = useNavigate()
  const tiles = useAtomValue(mapTilesAtom)

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

const CreateTiles = ({ mapRef }) => {
  const mapMode = useAtomValue(mapModeAtom)
  const drawMode = useAtomValue(mapDrawModeAtom)
  const refreshTiles = useSetAtom(refreshTilesAtom)
  const [features, setFeatures] = useAtom(featuresAtom)

  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.getMap().showTileBoundaries = mapMode == CREATE_MODE
    if (mapMode == CREATE_MODE) {
      // set zoom to 12, animate it
      mapRef.current.getMap().setZoom(11)
    }
  }, [mapRef, drawMode])

  const onClick = async () => {
    if (!Object.keys(features).length || !mapRef.current) return

    const feature = Object.values(features)[0]
    const mapInstance = mapRef.current.getMap()
    const currentZoom = Math.round(mapInstance.getZoom())

    await axios.post(`${API_URL}/area`, {
      coords: feature.geometry.coordinates[0],
      zoom: currentZoom,
    })
    await wait(1000)
    refreshTiles()
  }

  const onClear = () => {
    setFeatures({})
  }

  const hasFeatures = Object.keys(features).length > 0

  const title =
    drawMode === 'draw_polygon' ? 'Create tiles' : 'Create detailed tile'
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

const MapContainer = () => {
  const navigate = useNavigate()
  const map = useRef(null)
  const mapMode = useAtomValue(mapModeAtom)
  const tiles = useAtomValue(mapTilesAtom)
  // const tile = useTile()
  const [tileOpacity, setTileOpacity] = useState(0.65)
  // const [islandMask, setIslandMask] = useState(false)

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
    const coords = [event.lngLat.lng, event.lngLat.lat]
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

  // useEffect(() => {
  //   if (!map.current || !tile) return
  //   const mapInstance = map.current.getMap()
  //   const diff = tile.center[0] - tile.bbox[0]
  //   const offsetCenter = [tile.center[0] + diff * 2.25, tile.center[1]]
  //   const tileChildrenZoom = tile.tiles.map((t) => t.tile[2])
  //   const minZoom = Math.min(...tileChildrenZoom)
  //   mapInstance.flyTo({
  //     center: offsetCenter,
  //     zoom: minZoom - 1,
  //   })
  // }, [tile, map.current])

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
          {mapMode == VIEW_MODE && <TileList />}
        </Card>
      </MapControlsContainer>
    </Container>
  )
}

export default MapContainer
