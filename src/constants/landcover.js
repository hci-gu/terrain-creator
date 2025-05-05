// export const landcoverTypes = [
//   {
//     color: '#419BDF',
//     name: 'Water',
//     key: 'water',
//     spawnSettings: {
//       sheep: 0.0,
//       fox: 0.0,
//       goat: 0.0,
//     },
//   },
//   {
//     color: '#397D49',
//     name: 'Trees',
//     key: 'trees',
//     spawnSettings: {
//       sheep: 0.25,
//       fox: 0.25,
//       goat: 0.1,
//     },
//   },
//   {
//     color: '#88B053',
//     name: 'Grass',
//     key: 'grass',
//     spawnSettings: {
//       sheep: 0.5,
//       fox: 0.5,
//       goat: 0.25,
//     },
//   },
//   {
//     color: '#DFC35A',
//     name: 'Shrub',
//     key: 'shrub',
//     spawnSettings: {
//       sheep: 0.1,
//       fox: 0.25,
//       goat: 0.1,
//     },
//   },
//   {
//     color: '#E49635',
//     name: 'Crops',
//     key: 'crops',
//     spawnSettings: {
//       sheep: 0.1,
//       fox: 0.1,
//       goat: 0.1,
//     },
//   },
//   {
//     color: '#C4281B',
//     name: 'Built',
//     key: 'built',
//     spawnSettings: {
//       sheep: 0,
//       fox: 0,
//       goat: 0,
//     },
//   },
//   {
//     color: '#5e6572',
//     name: 'Bare',
//     key: 'bare',
//     spawnSettings: {
//       sheep: 0.05,
//       fox: 0.05,
//       goat: 0.25,
//     },
//   },
//   {
//     color: '#B39FE1',
//     name: 'Snow',
//     key: 'snow',
//     spawnSettings: {
//       sheep: 0.05,
//       fox: 0.05,
//       goat: 0.25,
//     },
//   },
//   {
//     color: '#7A87C6',
//     name: 'Flooded vegetation',
//     key: 'flooded_vegetation',
//     spawnSettings: {
//       sheep: 0.05,
//       fox: 0.05,
//       goat: 0,
//     },
//   },
// ]
export const landcoverTypes = 
{
  "water": {
    color: '#419BDF',
    name: 'Water',
    spawnSettings: {
      sheep: 0.0,
      fox: 0.0,
      goat: 0.0,
    }
  },
  "trees": {
    color: '#397D49',
    name: 'Trees',
    spawnSettings: {
      sheep: 0.25,
      fox: 0.25,
      goat: 0.1,
    }
  },
  "grass": {
    color: '#88B053',
    name: 'Grass',
    spawnSettings: {
      sheep: 0.5,
      fox: 0.5,
      goat: 0.25,
    }
  },
  "shrub": {
    color: '#DFC35A',
    name: 'Shrub',
    spawnSettings: {
      sheep: 0.1,
      fox: 0.25,
      goat: 0.1,
    }
  },
  "crops": {
    color: '#E49635',
    name: 'Crops',
    spawnSettings: {
      sheep: 0.1,
      fox: 0.1,
      goat: 0.1,
    }
  },
  "built": {
    color: '#C4281B',
    name: 'Built',
    spawnSettings: {
      sheep: 0,
      fox: 0,
      goat: 0,
    }
  },
  "bare": {
    color: '#5e6572',
    name: 'Bare',
    spawnSettings: {
      sheep: 0.05,
      fox: 0.05,
      goat: 0.25,
    }
  },
  "snow": {
    color: '#B39FE1',
    name: 'Snow',
    spawnSettings: {
      sheep: 0.05,
      fox: 0.05,
      goat: 0.25,
    }
  },
  "flooded_vegetation": {
    color: '#7A87C6',
    name: 'Flooded vegetation',
    spawnSettings: {
      sheep: 0.05,
      fox: 0.05,
      goat: 0,
    }
  }
}

export const getLandcoverCoverageForTile = (key, tile) => {
  const value = tile.landcover.coverage[key]

  if (value === undefined) {
    return 0
  }
  return value.toFixed(2)
}

// seems redundant now that landcoverTypes is an object
// can easily get the spawn settings from the object by iterating over the keys:
// Object.values(landcoverTypes).map((type) => type.spawnSettings)

export const defaultSpawnForLandcoverAndAnimal = (landcoverType, animal) => {
  return landcoverTypes[landcoverType].spawnSettings[animal]
}

// Pre-computed spawn settings map
export const landcoverSpawnSettings = Object.values(landcoverTypes).reduce((acc, type) => {
  acc[type.name] = type.spawnSettings
  return acc
}, {})

// Pre-computed filters map
export const landcoverFilters = Object.values(landcoverTypes).reduce((acc, type) => {
  acc[type.name] = [0, 100]
  return acc
}, {})