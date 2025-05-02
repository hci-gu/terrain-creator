import { parse } from 'date-fns';
export const data = {
  tasks: [
    {
      id: 1,
      text: "PARENT",
      start: parse("2025-04-01", "yyyy-MM-dd", new Date()),
      end: parse("2025-04-07", "yyyy-MM-dd", new Date()),
      type: "terrainModification",
      // CUSTOM PROPERTIES
      mapTile: "/mapTile.png",
      mapLandcover: "/landcoverBare.png",
      mapLandcoverType: "bare",
      mapParent: null,
      mapChild: 2,
    },
    {
      id: 2,
      text: "CHILD",
      start: parse("2025-04-07", "yyyy-MM-dd", new Date()),
      end: parse("2025-04-15", "yyyy-MM-dd", new Date()),
      type: "terrainModification",
      // CUSTOM PROPERTIES
      mapTile: "/mapTile.png",
      mapLandcover: "/landcoverBuilt.png",
      mapLandcoverType: "built",
      mapParent: 1,
      mapChild: null,
    },
  ],
  links: [],
};
