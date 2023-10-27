import tilebelt from '@mapbox/tilebelt'
import distanceTable from './mapbox_distance_table.json' assert { type: 'json' }

export const tileToBBOX = (tile) => tilebelt.tileToBBOX(tile)

export const getMetersPerPixel = (zoom, latitude) => {
  // round for example 57.7 to 60
  const roundedLatitude = Math.round(latitude / 10) * 10
  return distanceTable[zoom][roundedLatitude]
}
