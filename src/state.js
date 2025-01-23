import { atom, useSetAtom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import _ from 'lodash'
import * as pocketbase from './pocketbase'
import { useEffect, useMemo } from 'react'

export const landcovers = [
  {
    color: '#419BDF',
    name: 'Water',
    spawnSettings: {
      sheep: 0.0,
      fox: 0.0,
      goat: 0.0,
    },
  },
  {
    color: '#397D49',
    name: 'Trees',
    spawnSettings: {
      sheep: 0.25,
      fox: 0.25,
      goat: 0.1,
    },
  },
  {
    color: '#88B053',
    name: 'Grass',
    spawnSettings: {
      sheep: 0.5,
      fox: 0.5,
      goat: 0.25,
    },
  },
  {
    color: '#DFC35A',
    name: 'Shrub',
    spawnSettings: {
      sheep: 0.1,
      fox: 0.25,
      goat: 0.1,
    },
  },
  {
    color: '#E49635',
    name: 'Crops',
    spawnSettings: {
      sheep: 0.1,
      fox: 0.1,
      goat: 0.1,
    },
  },
  {
    color: '#C4281B',
    name: 'Built',
    spawnSettings: {
      sheep: 0,
      fox: 0,
      goat: 0,
    },
  },
  {
    color: '#5e6572',
    name: 'Bare',
    spawnSettings: {
      sheep: 0.05,
      fox: 0.05,
      goat: 0.25,
    },
  },
  {
    color: '#B39FE1',
    name: 'Snow',
    spawnSettings: {
      sheep: 0.05,
      fox: 0.05,
      goat: 0.25,
    },
  },
  {
    color: '#7A87C6',
    name: 'Flooded vegetation',
    spawnSettings: {
      sheep: 0.05,
      fox: 0.05,
      goat: 0,
    },
  },
]

export const landcoverMap = _.keyBy(landcovers, 'name')

export const defaultSpawnForLandcoverAndAnimal = (landcover, animal) => {
  return landcoverMap[landcover].spawnSettings[animal]
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

  console.log(filteredTiles.length, tiles.length, filteredTiles)

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

export const tileAtom = atomFamily((id) =>
  atom((get) => {
    return get(tilesAtom).find((tile) => tile.id === id)
  })
)

export const spawnSettingsAtom = atom(
  landcovers.reduce((acc, curr) => {
    acc[curr.name] = curr.spawnSettings
    return acc
  }, {})
)
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
