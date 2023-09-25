import { atom, useAtomValue } from 'jotai'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export const tilesAtom = atom(async (get, { signal }) => {
  const response = await axios.get(`http://localhost:3000/tiles`, { signal })

  return response.data
})

export const useTile = () => {
  const { id } = useParams()
  const tiles = useAtomValue(tilesAtom)

  return tiles.find((tile) => tile.id === id)
}
