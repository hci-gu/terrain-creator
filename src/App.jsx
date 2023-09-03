import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import styled from '@emotion/styled'
import DarkModeToggle from './components/DarkModeToggle'
import { Title, Header } from '@mantine/core'
import MapContainer from './components/Map'
import { useAtomValue } from 'jotai'
import { tilesAtom } from './state'
import Tile from './pages/Tile'

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
    path: '/tile/:id',
    element: <TileRoute />,
  },
])

const App = () => {
  useAtomValue(tilesAtom)

  return (
    <>
      <Header
        height={64}
        sx={{
          margin: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
        }}
      >
        <Title>
          Ecotwin <span style={{ color: '#F2C94C', fontWeight: 900 }}>Map</span>
        </Title>
        <DarkModeToggle />
      </Header>
      <Container>
        <RouterProvider router={router} />
      </Container>
    </>
  )
}

export default App
