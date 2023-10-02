import { atom, useAtomValue } from 'jotai'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export const tilesAtom = atom(async (get, { signal }) => {
  const response = await axios.get(`${API_URL}/tiles`, { signal })

  return response.data
})

export const useTile = () => {
  const { id } = useParams()
  const tiles = useAtomValue(tilesAtom)

  return tiles.find((tile) => tile.id === id)
}
