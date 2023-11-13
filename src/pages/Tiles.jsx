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

const Container = styled.div`
  margin: 24px auto;
  width: 90%;

  > div {
    display: flex;
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

  return (
    <Container>
      <h1>Tiles - {tiles.length}</h1>
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
                  <Image src={tile.satellite} height={100} width={100} />
                </td>
                <td>
                  <Image src={tile.landcover} height={100} width={100} />
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
