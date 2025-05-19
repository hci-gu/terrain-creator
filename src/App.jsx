import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import DarkModeToggle from '@components/DarkModeToggle'
import { Title, Anchor, Tabs, AppShell, Group } from '@mantine/core'
import MapContainer from '@pages/map'
import { useInitTiles } from '@state'
import Tiles from '@pages/Tiles'
import Dashboard from '@pages/Dashboard'

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
      <AppShell header={{ height: 90.62 }} padding="md">
        <AppShell.Header>
          <Group
            wrap="nowrap"
            justify="space-between"
            align="center"
            ml="sm"
            mr="sm"
          >
            <Title>
              Ecotwin{' '}
              <span style={{ color: '#F2C94C', fontWeight: 900 }}>Map</span>
            </Title>
            <DarkModeToggle />
          </Group>
          <TabContainer />
        </AppShell.Header>
        <AppShell.Main h="100vh" w="100%">
          <RouterProvider router={router} />
        </AppShell.Main>
      </AppShell>
    </>
  )
}

export default App
