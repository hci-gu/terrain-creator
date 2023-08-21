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

module.exports = {
  earthEngine: () =>
    Object.keys(earthEngine).reduce((acc, key) => {
      acc[key] = hexToRgb(earthEngine[key])
      return acc
    }, {}),
}

// convert hex to rgb
const hexToRgb = (hex) => {
  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)

  return [r, g, b]
}
