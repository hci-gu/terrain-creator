import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import styled from '@emotion/styled'
import DarkModeToggle from './components/DarkModeToggle'
import { Title, Header, NavLink, Flex, Anchor, Tabs } from '@mantine/core'
import MapContainer from './components/Map'
import { useAtomValue } from 'jotai'
import { tilesAtom } from './state'
import Tile from './pages/Tile'
import Tiles from './pages/Tiles'

const Container = styled.div`
  margin: 0 auto;
  width: 100%;
`

const TileRoute = () => {
  return (
    <>
      <MapContainer />
      <Tile />
    </>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <MapContainer />,
  },
  {
    path: '/tiles',
    element: <Tiles />,
  },
  {
    path: '/tile/:id',
    element: <TileRoute />,
  },
])

const App = () => {
  useAtomValue(tilesAtom)

  return (
    <>
      <Header
        height={88}
        sx={{
          margin: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
        }}
      >
        <div>
          <Title>
            Ecotwin{' '}
            <span style={{ color: '#F2C94C', fontWeight: 900 }}>Map</span>
          </Title>
          <Tabs
            defaultValue={window.location.pathname == '/' ? 'map' : 'tiles'}
          >
            <Tabs.List>
              <Tabs.Tab
                value="map"
                onClick={() => {
                  window.location.href = '/'
                }}
              >
                <Anchor href="/">Map</Anchor>
              </Tabs.Tab>
              <Tabs.Tab
                value="tiles"
                onClick={() => {
                  window.location.href = '/tiles'
                }}
              >
                <Anchor href="/tiles">Tiles</Anchor>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </div>

        <DarkModeToggle />
      </Header>
      <Container>
        <RouterProvider router={router} />
      </Container>
    </>
  )
}

export default App
