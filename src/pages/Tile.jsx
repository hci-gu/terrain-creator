import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Drawer, Space, Text, Flex } from '@mantine/core'
import { Image as ImageComponent } from '@mantine/core'
import { useTile } from '../state'
import axios from 'axios'
import DrawTools from './DrawTools'

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

const Tile = () => {
  const navigate = useNavigate()
  const tile = useTile()
  const { id } = useParams()

  const onSave = async (canvasInstance) => {
    const image = await imageFromCanvas(canvasInstance)
    axios.post(`${API_URL}/tile/${id}/landcover`, {
      image,
    })
  }

  return (
    <Drawer
      opened
      position="right"
      onClose={() => navigate('/')}
      size={1200}
      overlayProps={{ opacity: 0.4, blur: 1 }}
    >
      <Text>
        <strong>Tile ID:</strong> {id}
      </Text>
      <DrawTools imgSrc={`${URL}${tile.landcover}`} onSave={onSave} />
      <Space h="md" />
      <Flex>
        <ImageComponent src={tile.satellite} width={256} />
        <Space w="md" />
        <ImageComponent src={tile.heightmap} width={256} />
      </Flex>
    </Drawer>
  )
}

export default Tile
