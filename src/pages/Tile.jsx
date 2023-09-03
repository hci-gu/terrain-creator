import React, { useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Drawer, Button, Space, Text, Image, Flex } from '@mantine/core'
import { useTile } from '../state'
import axios from 'axios'
import DrawTools from './DrawTools'

const Tile = () => {
  const navigate = useNavigate()
  const tile = useTile()
  console.log(tile)
  const { id } = useParams()

  const onSave = (canvasInstance) => {
    const drawnImageData = canvasInstance.getDataURL()
    const drawnImage = new Image()
    drawnImage.src = drawnImageData

    const bgImageData = canvasInstance.canvas.grid.toDataURL('image/png')
    const bgImage = new Image()
    bgImage.src = bgImageData
    // combine on new canvas
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bgImage, 0, 0)
    ctx.drawImage(drawnImage, 0, 0)
    // console.log(canvas)
    const image = canvas.toDataURL('image/png')
    axios.post(`http://localhost:3000/tile/${id}/landcover`, {
      image,
    })
  }

  console.log(tile)

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
      <DrawTools
        imgSrc={`http://localhost:5173${tile.landcover}`}
        onSave={onSave}
      />
      <Space h="md" />
      <Flex>
        <Image src={tile.satellite} width={256} />
        <Space w="md" />
        <Image src={tile.heightmap} width={256} />
      </Flex>
    </Drawer>
  )
}

export default Tile
