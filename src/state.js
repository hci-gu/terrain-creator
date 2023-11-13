import { atom, useAtomValue } from 'jotai'
import { atomWithDefault } from 'jotai/utils'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export const landcovers = [
  {
    color: '#8ac5ff',
    name: 'Water',
  },
  {
    color: '#fed766',
    name: 'Sand',
  },
  {
    color: '#285330',
    name: 'Trees',
  },
  {
    color: '#79ab5f',
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
export const filteredTilesAtom = atom(async (get) => {
  const tiles = await get(tilesAtom)
  const filters = get(landcoverFiltersAtom)

  return tiles.filter((tile) => {
    const coverage = tile.coverage || {}
    const filtered = Object.keys(filters).every((filter) => {
      if (filters[filter] === 0) return true

      return coverage[nameToKey(filter)] >= filters[filter]
    })

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

export const landcoverFiltersAtom = atom(
  landcovers.reduce((acc, cur) => {
    acc[cur.name] = 0
    return acc
  }, {})
)
