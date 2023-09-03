import { atom, useAtomValue } from 'jotai'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export const tilesAtom = atom(async (get, { signal }) => {
  const response = await axios.get(`http://localhost:3000/tiles`, { signal })

  const tiles = response.data

  return tiles.map((tile) => {
    const arrayOfBboxes = tile.tiles.map((tile) => tile.bbox)

    // Initialize an empty bbox with high and low values
    let overallBbox = [Infinity, Infinity, -Infinity, -Infinity]

    // Iterate through the array of bboxes and expand the overall bbox
    arrayOfBboxes.forEach((bbox) => {
      const [minX, minY, maxX, maxY] = bbox
      overallBbox = [
        Math.min(minX, overallBbox[0]),
        Math.min(minY, overallBbox[1]),
        Math.max(maxX, overallBbox[2]),
        Math.max(maxY, overallBbox[3]),
      ]
    })

    // set center position of the tile
    tile.center = [
      (overallBbox[0] + overallBbox[2]) / 2,
      (overallBbox[1] + overallBbox[3]) / 2,
    ]

    tile.bbox = overallBbox
    return tile
  })
})

export const useTile = () => {
  const { id } = useParams()
  const tiles = useAtomValue(tilesAtom)

  return tiles.find((tile) => tile.id === id)
}
