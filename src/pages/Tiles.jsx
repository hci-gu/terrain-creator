import { useAtom, useAtomValue } from 'jotai'
import {
  filteredTilesAtom,
  landcoverFiltersAtom,
  landcovers,
  locationFilterDistanceAtom,
  tilesAtom,
} from '../state'
import { Image, Slider, Table } from '@mantine/core'
import { Suspense, useState } from 'react'
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react'
import styled from '@emotion/styled'
import { IconDownload } from '@tabler/icons-react'
import JSZip from 'jszip'
import SearchBox from '../components/Searchbox'

const Container = styled.div`
  margin: 24px auto;
  width: 90%;

  > div {
    display: flex;
  }

  > header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    > div {
      display: flex;
      align-items: center;
      cursor: pointer;
      :hover {
        text-decoration: underline;
      }

      > svg {
        margin-left: 8px;
      }
    }
  }
`

const FiltersContainer = styled.div`
  width: 200px;
  padding: 16px;

  > div {
    margin-top: 8px;
  }
`

const nameToKey = (name) => name.toLowerCase().replace(' ', '_')
const coverageForName = (tile, name) => {
  const value = tile.coverage[nameToKey(name)]

  if (value === undefined) {
    return 0
  }
  return (value * 100).toFixed(2)
}

const ColorBlock = ({ color }) => {
  return (
    <div
      style={{ backgroundColor: color, width: 16, height: 16, marginRight: 4 }}
    ></div>
  )
}

const LocationDistanceSlider = () => {
  const [distance, setDistance] = useAtom(locationFilterDistanceAtom)

  return (
    <div>
      Distance to location
      <Slider
        min={0.01}
        max={10}
        step={0.01}
        value={distance}
        onChange={(value) => setDistance(value)}
      />
    </div>
  )
}

const LandCoverFilter = ({ name }) => {
  const [filters, setFilters] = useAtom(landcoverFiltersAtom)

  return (
    <div>
      {name}
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={filters[name]}
        label={(value) => `${value * 100} %`}
        onChange={(value) =>
          setFilters({
            ...filters,
            [name]: value,
          })
        }
      />
    </div>
  )
}

const LandcoverFilters = () => {
  return (
    <FiltersContainer>
      {landcovers.map((landCover) => (
        <LandCoverFilter name={landCover.name} />
      ))}
      <LocationDistanceSlider />
    </FiltersContainer>
  )
}

const TileList = () => {
  const [selectedLandcover, setSelectedLandcover] = useState({
    direction: 'asc',
    name: '',
  })

  const tiles = useAtomValue(filteredTilesAtom)

  return (
    <div>
      <Table
        withBorder
        withColumnBorders
        highlightOnHover
        style={{ tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            <th>Tile</th>
            <th>Landcover</th>
            {landcovers.map((landCover) => (
              <th
                key={landCover.name}
                onClick={() =>
                  setSelectedLandcover({
                    ...landCover,
                    direction:
                      selectedLandcover.name != landCover.name
                        ? 'desc'
                        : selectedLandcover.direction === 'asc'
                        ? 'desc'
                        : 'asc',
                  })
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight:
                      selectedLandcover.name == landCover.name ? 900 : 500,
                  }}
                >
                  <ColorBlock color={landCover.color} />
                  {landCover.name}
                  {selectedLandcover.name == landCover.name &&
                    (selectedLandcover.direction === 'asc' ? (
                      <IconSortAscending />
                    ) : (
                      <IconSortDescending />
                    ))}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiles.map((tile) => (
            <tr key={`Tile_${tile.id}`}>
              <td>
                <Image
                  key={`${tile.id}_satellite`}
                  src={tile.satellite}
                  max-height={100}
                  max-width={100}
                />
              </td>
              <td>
                <Image
                  key={`${tile.id}_landcover`}
                  src={tile.landcover}
                  max-height={100}
                  max-width={100}
                />
              </td>
              {landcovers.map((landCover) => (
                <td key={`${landCover.name}_${tile.id}`}>
                  {coverageForName(tile, landCover.name)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <LandcoverFilters />
    </div>
  )
}

const DownloadButton = () => {
  const tiles = useAtomValue(filteredTilesAtom)
  const download = async () => {
    const zip = new JSZip()
    const texturesFolder = zip.folder('textures')
    const landcoversFolder = zip.folder('landcovers')
    const geotiffsFolder = zip.folder('geotiffs')

    for (let tile of tiles) {
      const [texture, landcover, geoTiff] = await Promise.all([
        fetch(tile.textureSmall).then((res) => res.blob()),
        fetch(tile.landcoverSmall).then((res) => res.blob()),
        fetch(tile.geoTiffSmall).then((res) => res.blob()),
      ])
      texturesFolder.file(`${tile.id}.png`, texture)
      landcoversFolder.file(`${tile.id}.png`, landcover)
      geotiffsFolder.file(`${tile.id}.tif`, geoTiff)
    }

    // download the zip
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = window.URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tiles.zip'
      a.click()
    })
  }

  return (
    <div onClick={() => download()}>
      Download
      <IconDownload />
    </div>
  )
}

export default function Tiles() {
  // tiles.sort((a, b) => {
  //   const aCoverage = a.coverage[nameToKey(selectedLandcover.name)]
  //   const bCoverage = b.coverage[nameToKey(selectedLandcover.name)]

  //   if (aCoverage === undefined) {
  //     return 1
  //   }

  //   if (bCoverage === undefined) {
  //     return -1
  //   }

  //   return selectedLandcover.direction === 'asc'
  //     ? aCoverage - bCoverage
  //     : bCoverage - aCoverage
  // })

  return (
    <Container>
      <header>
        <h1>Tiles</h1>
        <SearchBox />
        <DownloadButton />
      </header>

      <Suspense fallback={() => <div>Loading...</div>}>
        <TileList />
      </Suspense>
    </Container>
  )
}
