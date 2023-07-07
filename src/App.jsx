import React, { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import DarkModeToggle from './components/DarkModeToggle'
import { Title, Header } from '@mantine/core'
import MapContainer from './components/Map'

const Container = styled.div`
  margin: 0 auto;
  width: 100%;
`

const App = () => {
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
        <MapContainer />
      </Container>
    </>
  )
}

export default App
