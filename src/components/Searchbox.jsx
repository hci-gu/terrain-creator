// SearchBox.jsx
import React, { Suspense, useState, useTransition } from 'react'
import { TextInput, Menu, Badge, ActionIcon } from '@mantine/core'
import styled from '@emotion/styled'
import { debounce } from 'lodash'
import axios from 'axios'
import { useAtom, useSetAtom } from 'jotai'
import { locationFilterAtom } from '../state'
import { IconX } from '@tabler/icons-react'

const StyledTextInput = styled(TextInput)`
  position: relative;
`

const SearchWrapper = styled.div`
  display: flex;
  flex-direction: column;

  > div {
    margin-top: 8px;
  }
`

function SearchBox() {
  const [inputValue, setInputValue] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [location, setLocation] = useAtom(locationFilterAtom)

  // Function to fetch search results
  const fetchSearchResults = async (query) => {
    if (query.length > 0) {
      try {
        const response = await axios.get(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json`,
          {
            params: {
              access_token: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
              limit: 5,
            },
          }
        )
        setSearchResults(response.data.features)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    } else {
      setSearchResults([])
    }
  }

  // Debounced function
  const debouncedFetchResults = debounce(fetchSearchResults, 1000)

  // Handle input change
  const handleInputChange = (event) => {
    setInputValue(event.target.value)
    debouncedFetchResults(event.target.value)
  }

  const onResultClick = (result) => {
    setInputValue('')
    setSearchResults([])
    setLocation({
      name: result.place_name,
      location: result.geometry.coordinates,
    })
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Menu
        shadow="md"
        width={200}
        opened={searchResults.length > 1 ? true : false}
      >
        <Menu.Target>
          <SearchWrapper>
            <StyledTextInput
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Search for a location"
            />
            {location.name && (
              <Badge
                onClick={() => setLocation({})}
                leftSection={
                  <ActionIcon
                    size="xs"
                    color="blue"
                    radius="xl"
                    variant="transparent"
                  >
                    <IconX size={18} />
                  </ActionIcon>
                }
              >
                {location.name}
              </Badge>
            )}
          </SearchWrapper>
        </Menu.Target>
        <Menu.Dropdown>
          {searchResults.map((result, index) => (
            <Menu.Item key={index} onClick={() => onResultClick(result)}>
              {result.place_name}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Suspense>
  )
}

export default SearchBox
