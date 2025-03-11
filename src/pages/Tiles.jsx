import { useAtom, useAtomValue } from 'jotai'
import {
  filteredTilesAtom,
  landcoverFiltersAtom,
  landcovers,
  locationFilterAtom,
  locationFilterDistanceAtom,
  tilesAtom,
} from '../state'
import { Image, RangeSlider, Slider, Table, Text } from '@mantine/core'
import { Suspense, useState } from 'react'
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react'
import styled from '@emotion/styled'
import { IconDownload } from '@tabler/icons-react'
import JSZip from 'jszip'
import SearchBox from '../components/Searchbox'
import LoadingSpinner from '../components/LoadingSpinner'

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
  if (!tile.coverage) {
    return 0
  }
  const value = tile.coverage[nameToKey(name)]

  if (value === undefined) {
    return 0
  }
  return value.toFixed(2)
}

const ColorBlock = ({ color }) => {
  return (
    <div
      style={{ backgroundColor: color, width: 16, height: 16, marginRight: 4 }}
    ></div>
  )
}

const LocationDistanceSlider = () => {
  const { location } = useAtomValue(locationFilterAtom)
  const [distance, setDistance] = useAtom(locationFilterDistanceAtom)

  return (
    <div>
      <Text color={!!location ? 'black' : 'gray'}>Distance to location</Text>
      <Slider
        disabled={!location}
        min={0}
        max={1000}
        step={10}
        value={distance}
        // aprox lat/lng difference to km
        label={(value) => `${value} km`}
        onChange={(value) => setDistance(value)}
      />
    </div>
  )
}

const LandCoverFilter = ({ name }) => {
  const [filters, setFilters] = useAtom(landcoverFiltersAtom)

  // console.log(filters)

  return (
    <div>
      {name}
      <RangeSlider
        min={0}
        max={100}
        value={filters[name]}
        label={(value) => `${value} %`}
        onChange={(value) => {
          setFilters({
            ...filters,
            [name]: value,
          })
        }}
      />
    </div>
  )
}

const LandcoverFilters = () => {
  return (
    <FiltersContainer>
      <Text size="lg" fw="bolder">
        Filters
      </Text>
      {landcovers.map((landCover) => (
        <LandCoverFilter
          name={landCover.name}
          key={`Filter_${landCover.name}`}
        />
      ))}
      {/* <LocationDistanceSlider /> */}
    </FiltersContainer>
  )
}

const TileList = ({ tiles }) => {
  const [selectedLandcover, setSelectedLandcover] = useState({
    direction: 'asc',
    name: '',
  })

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
                  max-height={50}
                  max-width={50}
                />
              </td>
              <td>
                <Image
                  key={`${tile.id}_landcover`}
                  src={tile.landcover.url}
                  max-height={50}
                  max-width={50}
                />
              </td>
              {landcovers.map((landCover) => (
                <td key={`${landCover.name}_${tile.id}`}>
                  {coverageForName(tile.landcover, landCover.name)}%
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

const DownloadButton = ({ tiles }) => {
  const download = async () => {
    const zip = new JSZip()
    const texturesFolder = zip.folder('landcovers')
    const landcoversFolder = zip.folder('landcovers_small')
    // const geotiffsFolder = zip.folder('geotiffs')

    for (let tile of tiles) {
      const [landcover, landcover_small] = await Promise.all([
        fetch(tile.landcover.url).then((res) => res.blob()),
        fetch(tile.landcover.url_small).then((res) => res.blob()),
        // fetch(tile.geoTiffSmall).then((res) => res.blob()),
      ])
      texturesFolder.file(`${tile.id}.png`, landcover)
      landcoversFolder.file(`${tile.id}.png`, landcover_small)
      // geotiffsFolder.file(`${tile.id}.tif`, geoTiff)
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
  const tiles = useAtomValue(filteredTilesAtom)
  return (
    <Container>
      <header>
        <h1>Tiles - {tiles.length}</h1>
        <SearchBox />
        <Suspense fallback={<LoadingSpinner />}>
          <DownloadButton tiles={tiles} />
        </Suspense>
      </header>

      <Suspense fallback={<LoadingSpinner />}>
        <TileList tiles={tiles} />
      </Suspense>
    </Container>
  )
}
