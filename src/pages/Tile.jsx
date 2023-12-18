import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Drawer, Space, Text, Flex, Button } from '@mantine/core'
import { Image as ImageComponent } from '@mantine/core'
import { mapViewportAtom, refreshTilesAtom, tileAtom } from '../state'
import axios from 'axios'
import DrawTools from './DrawTools'
import { useAtomValue, useSetAtom } from 'jotai'
import { IconDownload } from '@tabler/icons-react'

const API_URL = import.meta.env.VITE_API_URL
const URL = import.meta.env.VITE_URL

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
  const navigate = useNavigate()
  const refreshTiles = useSetAtom(refreshTilesAtom)
  const setViewport = useSetAtom(mapViewportAtom)
  const { id } = useParams()
  const tile = useAtomValue(tileAtom(id))
  const [loading, setLoading] = useState(false)

  const onSave = async (canvasInstance) => {
    setLoading(true)
    const image = await imageFromCanvas(canvasInstance)
    await axios.post(`${API_URL}/tile/${id}/landcover`, {
      image,
    })
    setLoading(false)
    refreshTiles()
  }

  const onDelete = async () => {
    setLoading(true)
    await axios.delete(`${API_URL}/tile/${id}/landcover`, {})
    setLoading(false)
    refreshTiles()
  }

  useEffect(() => {
    const diff = tile.center[0] - tile.bbox[0]
    const offsetCenter = [tile.center[0] + diff * 2.25, tile.center[1]]
    const tileChildrenZoom = tile.tiles.map((t) => t.tile[2])
    const minZoom = Math.min(...tileChildrenZoom)
    setTimeout(() => {
      setViewport({
        latitude: offsetCenter[1],
        longitude: offsetCenter[0],
        zoom: minZoom - 1,
      })
    }, 3000)
  }, [])

  if (!tile) return <div>Loading...</div>

  return (
    <Drawer
      opened
      position="right"
      onClose={() => navigate('/')}
      size={'60vw'}
      overlayProps={{ opacity: 0.4, blur: 1 }}
    >
      <Text>
        <strong>Tile ID:</strong> {id}
      </Text>
      {!tile.landcover && (
        <Text>Creating tile, this can take a few minutes</Text>
      )}
      {tile.landcover && (
        <DrawTools
          imgSrc={`${URL}${tile.landcover}`}
          tile={tile}
          onSave={onSave}
          onDelete={onDelete}
          loading={loading}
        />
      )}
      <Space h="md" />
      <Flex gap="md">
        <ImageComponent
          src={tile.satellite}
          width={256}
          fallbackSrc={`${URL}/images/loading.png`}
        />
        <ImageComponent
          src={tile.heightmap}
          width={256}
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
    </Drawer>
  )
}

export default Tile
