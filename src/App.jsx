import React, { useEffect, useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import DarkModeToggle from './components/DarkModeToggle'
import { Title, Anchor, Tabs, AppShell, Flex } from '@mantine/core'
import MapContainer from './components/Map'
import { useInitTiles } from './state'
import Tile from './pages/Tile'
import Tiles from './pages/Tiles'

const TabContainer = () => {
  return (
    <Tabs defaultValue={window.location.pathname == '/' ? 'map' : 'tiles'}>
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
        <Tabs.Tab
          value="wasm"
          onClick={() => {
            window.location.href = '/wasm'
          }}
        >
          <Anchor href="/wasm">Wasm</Anchor>
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        <TabContainer />
        <MapContainer />
      </>
    ),
  },
  {
    path: '/tiles',
    element: (
      <>
        <TabContainer />
        <Tiles />,
      </>
    ),
  },
  {
    path: '/tile/:id',
    element: <Tile />,
  },

  // {
  //   path: '/wasm',
  //   element: (
  //     <>
  //       <TabContainer />
  //     </>
  //   ),
  // },
])

const App = () => {
  useInitTiles()
  return (
    <>
      <AppShell>
        <AppShell.Header pl="sm" pr="sm" h={64}>
          <Flex justify="space-between" align="center" h="100%">
            <Title>
              Ecotwin{' '}
              <span style={{ color: '#F2C94C', fontWeight: 900 }}>Map</span>
            </Title>
            <DarkModeToggle />
          </Flex>
        </AppShell.Header>
        <AppShell.Main mt={64} w="100vw">
          <RouterProvider router={router} />
        </AppShell.Main>
      </AppShell>
    </>
  )
}

export default App
