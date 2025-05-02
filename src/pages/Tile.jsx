import React, { Suspense, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Space,
  Text,
  Flex,
  Button,
  Breadcrumbs,
  Anchor,
  Container,
  Divider,
  Title,
  Stack,
  Card,
  Slider,
  Select,
} from '@mantine/core'
import { Image as ImageComponent } from '@mantine/core'
import {
  defaultSpawnForLandcoverAndAnimal,
  landcoverMap,
  landcovers,
  mapViewportAtom,
  simulationAtom,
  spawnSettingsAtom,
  tileAtom,
} from '../state'
import axios from 'axios'
import DrawTools from './DrawTools'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { IconDownload } from '@tabler/icons-react'
import * as pocketbase from '../pocketbase'
import { formatDate } from '../utils'
import { IconTrashFilled } from '@tabler/icons-react'
import { Simulations } from './Simulation'
import { GanttView } from './management_plan/ManagementPlanGanttView'

const API_URL = import.meta.env.VITE_API_URL
const URL = import.meta.env.VITE_URL

const convertDataUrlToBlob = (dataUrl) => {
  // Split the data URL at the comma to get the base64 encoded data
  const parts = dataUrl.split(',')
  const base64Data = parts[1]
  const contentType = parts[0].split(':')[1].split(';')[0]

  // Convert base64 to raw binary data held in a string
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  // Convert to an array of bytes
  const byteArray = new Uint8Array(byteNumbers)

  // Create a blob from the byte array
  const blob = new Blob([byteArray], { type: contentType })
  return blob
}

const imageFromCanvas = (canvasInstance) => {
  return new Promise((resolve) => {
    const drawnImageData = canvasInstance.getDataURL()
    const drawnImage = new Image()

    const bgImageData = canvasInstance.canvas.grid.toDataURL('image/png')
    const bgImage = new Image()

    // Counter for loaded images
    let imagesLoaded = 0

    // Once all images are loaded, draw them
    const onImageLoaded = () => {
      imagesLoaded++
      if (imagesLoaded === 2) {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 1024
        const ctx = canvas.getContext('2d')
        ctx.drawImage(bgImage, 0, 0, 1024, 1024)
        ctx.drawImage(drawnImage, 0, 0, 1024, 1024)
        const image = canvas.toDataURL('image/png')
        resolve(image)
      }
    }

    // Set up the load events
    drawnImage.onload = onImageLoaded
    bgImage.onload = onImageLoaded

    // Start loading the images
    drawnImage.src = drawnImageData
    bgImage.src = bgImageData
  })
}

const DownloadButton = ({ type, tile }) => {
  const download = () => {
    const link = document.createElement('a')
    link.download = `${tile.id}_${type}.png`
    switch (type) {
      case 'landcover':
        link.href = tile.landcover
        break
      case 'heightmap':
        link.href = tile.heightmap
      case 'landcover texture':
        link.href = tile.texture
        break
      case 'geoTiff':
        link.download = `${tile.id}_${type}.tif`
        link.href = tile.geoTiff
        break
      default:
        break
    }
    link.click()
  }

  const title = `${type[0].toUpperCase()}${type.slice(1)}`

  return (
    <Button variant="outline" onClick={() => download()}>
      <Flex align="center" justify="space-between">
        <IconDownload /> {title}
      </Flex>
    </Button>
  )
}

const Tile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const tile = useAtomValue(tileAtom(id))

  const onSave = async (canvasInstance) => {
    const image = await imageFromCanvas(canvasInstance)
    const file = new File([convertDataUrlToBlob(image)], 'landcover.png', {
      type: 'image/png',
    })
    pocketbase.updateLandCover(tile.landcover.id, file)
  }

  const onDelete = async () => {
    pocketbase.updateLandCover(tile.landcover.id, null)
  }

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
            {tile.landcover && (
              <Flex justify="space-between">
                <DrawTools
                  imgSrc={tile.landcover.url}
                  tile={tile}
                  onSave={onSave}
                  onDelete={onDelete}
                />
                {/* <SpawnSettings /> */}
              </Flex>
            )}
            <Space h="md" />
            <Flex gap="md">
              <ImageComponent
                src={tile.satellite}
                w={256}
                h={256}
                radius={8}
                fallbackSrc={`${URL}/images/loading.png`}
              />
              <ImageComponent
                src={tile.heightmap.url}
                w={256}
                h={256}
                radius={8}
                key={`HM_${new Date()}`}
                fallbackSrc={`${URL}/images/loading.png`}
              />
              <Flex direction="column" gap="md">
                <Text>Download textures:</Text>
                <DownloadButton type="heightmap" tile={tile} />
                <DownloadButton type="landcover" tile={tile} />
                <DownloadButton type="landcover texture" tile={tile} />
                <DownloadButton type="geoTiff" tile={tile} />
              </Flex>
            </Flex>
          </div>
          <Divider orientation="vertical" m="md" />
          <Button 
            variant="filled" 
            onClick={() => navigate(`/tile/${id}/management-plan`)}
            mb="md"
          >
            View Management Plan
          </Button>
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
