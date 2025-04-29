import React, { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import {
  Space,
  Text,
  Flex,
  Button,
  Breadcrumbs,
  Anchor,
  Container,
  Divider,
} from '@mantine/core'
import { Image as ImageComponent } from '@mantine/core'
import { tileAtom } from '../../state'
import LandData from './LandData'
import { useAtomValue } from 'jotai'
import { IconDownload } from '@tabler/icons-react'
import * as pocketbase from '../../pocketbase'
import { Simulations } from '../Simulation'
import OceanData from './OceanData'

const Tile = () => {
  const { id } = useParams()
  const tile = useAtomValue(tileAtom(id))

  if (!tile) return null

  return (
    <Suspense>
      <Container fluid>
        <Breadcrumbs pt="md" pb="md">
          <Anchor href="/" key="/">
            Home
          </Anchor>
          <Anchor href={`/tile/${tile.id}`} key="/tile">
            Tile
          </Anchor>
        </Breadcrumbs>
        <Flex>
          <div style={{ width: '50%' }}>
            {!tile.landcover && (
              <Text>Creating tile, this can take a few minutes</Text>
            )}
            {tile.oceanData ? (
              <OceanData oceanData={tile.oceanData} />
            ) : (
              <LandData tile={tile} />
            )}
          </div>
          <Divider orientation="vertical" m="md" />
          <div style={{ width: '50%' }}>
            <Simulations tile={tile} />
          </div>
        </Flex>
      </Container>
    </Suspense>
  )
}

export default Tile
