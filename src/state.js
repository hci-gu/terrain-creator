import { atom, useAtom, useSetAtom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import axios from 'axios'
import _ from 'lodash'
import * as pocketbase from '../lib/pocketbase'
import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL

export const landcovers = [
  {
    color: '#419BDF',
    name: 'Water',
  },
  {
    color: '#397D49',
    name: 'Trees',
  },
  {
    color: '#88B053',
    name: 'Grass',
  },
  {
    color: '#DFC35A',
    name: 'Shrub',
  },
  {
    color: '#E49635',
    name: 'Crops',
  },
  {
    color: '#C4281B',
    name: 'Built',
  },
  {
    color: '#5e6572',
    name: 'Bare',
  },
  {
    color: '#B39FE1',
    name: 'Snow',
  },
  {
    color: '#7A87C6',
    name: 'Flooded vegetation',
  },
]
const nameToKey = (name) => name.toLowerCase().replace(' ', '_')

export const mapViewportAtom = atom({
  longitude: 10.530891,
  latitude: 46.450686,
  // longitude: 12.1172326,
  // latitude: 57.301663,
  // longitude: 12.327145,
  // latitude: 45.438759,
  zoom: 13,
})

export const mapBoundsAtom = atom(null)

const _boundsToQuery = (bounds) => {
  const lat1 = bounds._sw.lat
  const lon1 = bounds._sw.lng
  const lat2 = bounds._ne.lat
  const lon2 = bounds._ne.lng

  return `bounds=${[lat1, lon1, lat2, lon2].join(',')}`
}

export const tilesAtom = atom([])

export const initializeTilesAtom = atom(
  (get) => get(tilesAtom),
  (get, set, action) => {
    // Fetch initial tiles data
    pocketbase.getTiles().then((tiles) => {
      set(tilesAtom, tiles)
    })

    pocketbase.subscribe(
      'tiles',
      '*',
      (e) => {
        set(tilesAtom, (prevTiles) => {
          switch (e.action) {
            case 'create':
              return [e.record, ...prevTiles]
            case 'update':
              return prevTiles.map((tile) =>
                tile.id === e.record.id ? e.record : tile
              )
            case 'delete':
              return prevTiles.filter((tile) => tile.id !== e.record.id)
            default:
              return prevTiles
          }
        })
      },
      true
    )

    pocketbase.subscribe(
      'landcovers',
      '*',
      (e) => {
        set(tilesAtom, (prevTiles) => {
          const tile = prevTiles.find(
            (tile) => tile.landcover.id === e.record.id
          )
          if (!tile) return prevTiles

          return prevTiles.map((t) =>
            t.id === tile.id ? { ...tile, landcover: e.record } : t
          )
        })
      },
      true
    )
  }
)

export const useInitTiles = () => {
  const initializeTiles = useSetAtom(initializeTilesAtom)
  const memo = useMemo(() => ({ inited: false }), [])

  useEffect(() => {
    if (memo.inited) return
    memo.inited = true
    initializeTiles()
  }, [memo])
}

export const tileAtom = atomFamily((id) =>
  atom((get) => {
    return get(tilesAtom).find((tile) => tile.id === id)
  })
)

export const locationFilterAtom = atom({})

export const locationFilterDistanceAtom = atom(100)

export const landcoverFiltersAtom = atom(
  landcovers.reduce((acc, cur) => {
    acc[cur.name] = [0, 100]
    return acc
  }, {})
)

export const mapDrawModeAtom = atom('simple_select')
export const VIEW_MODE = 'VIEW_MODE'
export const CREATE_MODE = 'CREATE_MODE'
export const mapModeAtom = atom((get) => {
  const features = get(featuresAtom)
  const mapDrawMode = get(mapDrawModeAtom)

  return mapDrawMode != 'simple_select' || Object.keys(features).length > 0
    ? CREATE_MODE
    : VIEW_MODE
})

export const showTileGridAtom = atom((get) => {
  const drawMode = get(mapDrawModeAtom)

  return drawMode == 'draw_point'
})

export const featuresAtom = atom({})
