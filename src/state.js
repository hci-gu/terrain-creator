import { atom, useSetAtom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import _ from 'lodash'
import * as pocketbase from './pocketbase'
import { useEffect, useMemo } from 'react'
import {
  landcoverSpawnSettings,
  landcoverFilters as initialLandcoverFilters,
} from '@constants/landcover'

import { parse, addDays, addMonths } from 'date-fns'

export const oceancovers = [
  {
    color: '#FCFDAF',
    name: 'Sand',
  },
  {
    color: '#07243E',
    name: 'Deep ocean',
  },
  {
    color: '#419BDF',
    name: 'Ocean',
  },
]
// export const landcoverMap = _.keyBy(landcovers, 'name')
const hexToRgb = (hex) => {
  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)
  return [r, g, b]
}
export const rgbForLandcoverType = (landcover) => {
  const hexColor = landcoverMap[landcover].color

  return hexToRgb(hexColor)
}
export const rgbForOceanType = (oceancover) => {
  const hexColor = oceancovers.find((cover) => cover.name === oceancover).color

  return hexToRgb(hexColor)
}

const nameToKey = (name) => name.toLowerCase().replace(' ', '_')

export const mapViewportAtom = atom({
  longitude: 18.530891,
  latitude: 56.450686,
  // longitude: 12.1172326,
  // latitude: 57.301663,
  // longitude: 12.327145,
  // latitude: 45.438759,
  zoom: 5,
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

export const getTileByIdAtom = atomFamily((id) =>
  atom((get) => {
    return get(tilesAtom).find((tile) => tile.id === id)
  })
)

export const refreshManagementPlansAtom = atom(new Date())
export const managementPlansAtom = atom(async (get) => {
  const _ = get(refreshManagementPlansAtom)
  return pocketbase.getManagementPlans()
})

export const getManagementPlanByIdAtom = atomFamily((id) =>
  atom(async (get) => {
    const plans = await get(managementPlansAtom)

    return plans.find((plan) => plan.id === id)
  })
)

export const spawnSettingsAtom = atom(landcoverSpawnSettings)

export const landcoverFiltersAtom = atom(initialLandcoverFilters)

export const filteredTilesAtom = atom((get) => {
  const tiles = get(tilesAtom)

  const landcoverFilters = get(landcoverFiltersAtom)

  const filteredTiles = tiles.filter((tile) => {
    const landcover = tile.landcover
    if (!landcover || !landcover.coverage) return false

    let allow = true
    for (const [name, [min, max]] of Object.entries(landcoverFilters)) {
      const value = landcover.coverage[nameToKey(name)] ?? 0
      if (value < min || value > max) {
        allow = false
      }
    }

    return allow
  })

  return filteredTiles
})

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
      true,
      'landcover,heightmap,oceanData,simulations'
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

    // pocketbase.subscribe(
    //   'simulations',
    //   '*',
    //   (e) => {
    //     set(tilesAtom, (prevTiles) => {
    //       const tile = prevTiles.find((tile) =>
    //         tile.simulations?.find((s) => s.id === e.record.id)
    //       )
    //       if (!tile) return prevTiles

    //       return prevTiles.map((t) => {
    //         console.log('UPDATE TILE', t)
    //         if (t.id === tile.id) {
    //           let simulations = []
    //           switch (e.action) {
    //             case 'create':
    //               simulations = [e.record, ...t.simulations]
    //               break
    //             case 'update':
    //               simulations = t.simulations.map((s) =>
    //                 s.id === e.record.id ? e.record : s
    //               )
    //               break
    //             case 'delete':
    //               simulations = t.simulations.filter(
    //                 (s) => s.id !== e.record.id
    //               )
    //             default:
    //           }
    //           return { ...t, simulations }
    //         }
    //         return t
    //       })
    //     })
    //   },
    //   true,
    //   'timesteps'
    // )
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

export const simulationAtom = atomFamily((id) =>
  atom(async (get) => {
    const tiles = get(tilesAtom)
    const tile = tiles.find((tile) =>
      tile.simulations?.find((sim) => sim.id === id)
    )

    if (!tile) return
    console.log('simAtom, ', tile)

    const sim = tile.simulations.find((sim) => sim.id === id)
    return sim
  })
)

export const timestepsAtom = atomFamily((id) =>
  atom(async (_) => {
    const timesteps = await pocketbase.timestepsForSimulation(id)
    return timesteps
  })
)

export const locationFilterAtom = atom({})

export const locationFilterDistanceAtom = atom(100)

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

export const colorSchemeAtom = atom('light')
