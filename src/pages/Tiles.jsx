import { useAtom, useAtomValue } from 'jotai'
import {
  filteredTilesAtom,
  landcoverFiltersAtom,
  landcovers,
  tilesAtom,
} from '../state'
import { Image, Slider, Table } from '@mantine/core'
import { useState } from 'react'
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react'
import styled from '@emotion/styled'
import { IconDownload } from '@tabler/icons-react'
import JSZip from 'jszip'

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
    </FiltersContainer>
  )
}

export default function Tiles() {
  const tiles = useAtomValue(filteredTilesAtom)
  const [selectedLandcover, setSelectedLandcover] = useState({
    direction: 'asc',
    name: '',
  })

  tiles.sort((a, b) => {
    const aCoverage = a.coverage[nameToKey(selectedLandcover.name)]
    const bCoverage = b.coverage[nameToKey(selectedLandcover.name)]

    if (aCoverage === undefined) {
      return 1
    }

    if (bCoverage === undefined) {
      return -1
    }

    return selectedLandcover.direction === 'asc'
      ? aCoverage - bCoverage
      : bCoverage - aCoverage
  })

  const download = async () => {
    const zip = new JSZip()
    const texturesFolder = zip.folder('textures')
    const landcoversFolder = zip.folder('landcovers')

    for (let tile of tiles) {
      const [texture, landcover] = await Promise.all([
        fetch(tile.textureSmall).then((res) => res.blob()),
        fetch(tile.landcoverSmall).then((res) => res.blob()),
      ])
      texturesFolder.file(`${tile.id}.png`, texture)
      landcoversFolder.file(`${tile.id}.png`, landcover)
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
    <Container>
      <header>
        <h1>Tiles - {tiles.length}</h1>
        <div onClick={() => download()}>
          Download
          <IconDownload />
        </div>
      </header>
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
              <tr>
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
    </Container>
  )
}
