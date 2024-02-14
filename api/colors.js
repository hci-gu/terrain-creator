export const EE_COLORS = {
  water: [65, 155, 223, 255],
  trees: [57, 125, 73, 255],
  grass: [136, 176, 83, 255],
  flooded_vegetation: [122, 135, 198, 255],
  crops: [228, 150, 53, 255],
  shrub: [223, 195, 90, 255],
  built: [196, 40, 27, 255],
  bare: [165, 155, 143, 255],
  snow: [179, 159, 225, 255],
}

export const LANDCOVER_COLORS = {
  water: {
    order: 1,
    paint: EE_COLORS.water,
    texture: [255, 255, 0, 255],
    rules: {
      type: 'add',
      amount: 1,
      blur: 18,
    },
  },
  // sand: {
  //   order: 0,
  //   paint: [254, 215, 102, 255],
  //   texture: [255, 255, 0, 0],
  //   rules: {
  //     type: 'add',
  //     amount: 0.15,
  //     blur: 36,
  //   },
  // },
  trees: {
    paint: EE_COLORS.trees,
    texture: [0, 255, 255, 255],
  },
  grass: {
    order: 2,
    paint: EE_COLORS.grass,
    texture: [0, 255, 0, 255],
    // rules: {
    //   type: 'subtract',
    //   amount: 0.1,
    //   blur: 24,
    // },
  },
  flooded_vegetation: {
    order: 2,
    paint: EE_COLORS.flooded_vegetation,
    texture: [255, 0, 0, 0],
  },
  crops: {
    order: 3,
    paint: EE_COLORS.crops,
    texture: [0, 255, 255, 0],
  },
  shrub: {
    order: 4,
    paint: EE_COLORS.shrub,
    texture: [255, 0, 255, 255],
  },
  built: {
    order: 5,
    paint: EE_COLORS.built,
    texture: [255, 0, 0, 255],
  },
  bare: {
    order: 6,
    paint: EE_COLORS.bare,
    texture: [0, 255, 0, 0],
  },
  snow: {
    order: 7,
    paint: EE_COLORS.snow,
    texture: [255, 255, 255, 255],
  },
}
