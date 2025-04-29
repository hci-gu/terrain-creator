import { Button, Flex, Space } from '@mantine/core'
import { useEffect } from 'react'
import { useRef } from 'react'
import CanvasDraw from 'react-canvas-draw'

const DrawingTools = ({ editRef, tile, canvasRef, color, brushRadius }) => {
  return (
    <Flex
      direction="column"
      style={{
        border: '1px solid #ccc',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
      }}
    >
      <CanvasDraw
        ref={(_ref) => {
          editRef.current = _ref
          if (canvasRef && _ref && _ref.canvas) {
            canvasRef.current = _ref.canvas.grid
          }
        }}
        brushColor={color}
        brushRadius={brushRadius}
        lazyRadius={0}
        canvasWidth={512}
        canvasHeight={512}
        enablePanAndZoom
      />
    </Flex>
  )
}

const MapData = ({
  tile,
  imageSrc,
  editableCanvasRef,
  processFunction,
  editable = false,
  color = '',
  brushRadius = 10,
  scale = 512,
}) => {
  const canvasRef = useRef()

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = scale
    canvas.height = scale

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      if (processFunction) {
        processFunction(canvas, img)
      } else {
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, scale, scale)
      }
    }
    img.src = imageSrc
  }, [canvasRef, imageSrc])

  if (!editable) {
    return (
      <canvas
        ref={canvasRef}
        width={scale}
        height={scale}
        style={{
          border: '1px solid #ccc',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
        }}
      />
    )
  }

  return (
    <DrawingTools
      canvasRef={canvasRef}
      editRef={editableCanvasRef}
      tile={tile}
      color={color}
      brushRadius={brushRadius}
    />
  )
}

export default MapData
