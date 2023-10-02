import { atom, useAtomValue } from 'jotai'
import { atomWithDefault } from 'jotai/utils'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export const mapViewportAtom = atom({
  longitude: 12.1172326,
  latitude: 57.301663,
  zoom: 13,
})

export const tilesAtom = atomWithDefault(async (get, { signal }) => {
  const response = await axios.get(`${API_URL}/tiles`, { signal })

  return response.data
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
