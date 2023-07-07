import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import axios from 'axios'

const ACCESS_TOKEN = process.env.VITE_MAPBOX_ACCESS_TOKEN
mapboxgl.accessToken = ACCESS_TOKEN

const MapContainer = () => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [lng, setLng] = useState(12.1172326)
  const [lat, setLat] = useState(57.301663)
  const [zoom, setZoom] = useState(13)

  useEffect(() => {
    if (map.current) return // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [lng, lat],
      zoom: zoom,
    })
    map.current.showTileBoundaries = true

    const modes = MapboxDraw.modes
    modes.draw_rectangle = DrawRectangle

    const draw = new MapboxDraw({
      modes,
    })

    map.current.addControl(draw, 'top-left')

    map.current.on('load', () => {
      draw.changeMode('draw_rectangle')
    })
    map.current.on('draw.create', async (e) => {
      const coords = e.features[0].geometry.coordinates[0]

      const data = await axios.post('http://localhost:3000/tile', {
        coords,
      })
    })
  })

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: 'calc(100vh - 60px)' }}
    />
  )
}

export default MapContainer
