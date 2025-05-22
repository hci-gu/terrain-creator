import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import DarkModeToggle from '@components/DarkModeToggle'
import { Title, Anchor, Tabs, AppShell, Group } from '@mantine/core'
import MapContainer from '@pages/map'
import { useInitTiles } from '@state'
import Tiles from '@pages/Tiles'
import Dashboard from '@pages/Dashboard'

const TabContainer = () => {
  const getDefaultTabValue = () => {
    const { pathname } = window.location
    if (pathname.includes('/dashboard')) {
      return null
    } else if (pathname === '/') {
      return 'map'
    } else if (pathname === '/tiles') {
      return 'tiles'
    }
    return 'map' // Default to map
  }

  return (
    <Tabs defaultValue={getDefaultTabValue()}>
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
  )
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <>
          <MapContainer />
        </>
      ),
    },
    {
      path: '/tiles',
      element: (
        <>
          <Tiles />,
        </>
      ),
    },
    {
      path: 'tile/:id_tile/dashboard',
      element: <Dashboard />,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
)

const App = () => {
  useInitTiles()
  return (
    <>
      {/* There is no way to have header height be dynamic, so we have to use a fixed height */}
      <AppShell header={{ height: 50 }} padding="6">
        <AppShell.Header>
          <Group
            wrap="nowrap"
            justify=""
            align="center"
            ml="sm"
            mr="sm"
          >
            <Title>
              Ecotwin{' '}
              <span style={{ color: '#F2C94C', fontWeight: 900 }}>Map</span>
            </Title>
            <TabContainer />
            <DarkModeToggle />
          </Group>
        </AppShell.Header>
        <AppShell.Main h="100vh" w="100%">
          <RouterProvider router={router} />
        </AppShell.Main>
      </AppShell>
    </>
  )
}

export default App
