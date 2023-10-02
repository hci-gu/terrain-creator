const earthEngine = {
  water: '#419BDF',
  trees: '#397D49',
  grass: '#A3C254',
  flooded_vegetation: '#7A87C6',
  crops: '#E49635',
  shrub: '#DFC35A',
  built: '#C4281B',
  bare: '#A59B8F',
  snow: '#B39FE1',
}

const LANDCOVER_COLORS = {
  ocean: {
    order: 1,
    paint: [138, 196, 255],
    rules: {
      type: 'subtract',
      amount: 0.75,
      blur: 18,
    },
  },
  sand: {
    order: 0,
    paint: [254, 215, 102],
    rules: {
      type: 'add',
      amount: 0.15,
      blur: 36,
    },
  },
  tree: {
    paint: [40, 83, 48],
  },
  grass: {
    order: 2,
    paint: [121, 171, 95],
    rules: {
      type: 'subtract',
      amount: 0.1,
      blur: 24,
    },
  },
  rock: {
    paint: [94, 101, 114],
    order: 3,
    rules: {
      type: 'add',
      amount: 0.2,
      blur: 12,
    },
  },
}

module.exports = {
  earthEngine: () =>
    Object.keys(earthEngine).reduce((acc, key) => {
      acc[key] = hexToRgb(earthEngine[key])
      return acc
    }, {}),
  LANDCOVER_COLORS,
}

// convert hex to rgb
const hexToRgb = (hex) => {
  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)

  return [r, g, b]
}
