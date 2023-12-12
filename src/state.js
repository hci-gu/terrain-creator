import { atom, useAtomValue } from 'jotai'
import { atomWithDefault } from 'jotai/utils'
import { useParams } from 'react-router-dom'
import axios from 'axios'

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

export const tilesAtom = atomWithDefault(async (get, { signal }) => {
  const response = await axios.get(`${API_URL}/tiles`, { signal })

  return response.data
})

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in kilometers
}

export const filteredTilesAtom = atom(async (get) => {
  const tiles = await get(tilesAtom)
  const filters = get(landcoverFiltersAtom)
  const { location } = get(locationFilterAtom)
  const locationDistance = get(locationFilterDistanceAtom)

  return tiles.filter((tile) => {
    const coverage = tile.coverage || {}
    const filtered = Object.keys(filters).every((filter) => {
      if (filter[0] == 0 && filter[1] == 100) return true

      return (
        coverage[nameToKey(filter)] >= filters[filter][0] / 100 &&
        coverage[nameToKey(filter)] <= filters[filter][1] / 100
      )
    })

    if (location) {
      // check distance to location
      // const distance = Math.sqrt(
      //   Math.pow(tile.center[0] - location[0], 2) +
      //     Math.pow(tile.center[1] - location[1], 2)
      // )
      const distance = haversineDistance(
        tile.center[0],
        tile.center[1],
        location[0],
        location[1]
      )
      return filtered && distance < locationDistance
    }

    return filtered
  })
})
export const refreshTilesAtom = atom(null, async (get, set, signal) => {
  const response = await axios.get(`${API_URL}/tiles`, { signal })

  set(tilesAtom, response.data)
})

export const useTile = () => {
  const { id } = useParams()
  const tiles = useAtomValue(tilesAtom)

  return tiles.find((tile) => tile.id === id)
}

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
