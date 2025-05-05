import React from 'react'
import { Image as ImageComponent } from '@mantine/core'
import { Flex, Text, Button } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'

const DownloadButton = ({ type, tile }) => {
  const download = () => {
    const link = document.createElement('a')
    link.download = `${tile.id}_${type}.png`
    switch (type) {
      case 'landcover':
        link.href = tile.landcover.url // Assuming landcover object has url
        break
      case 'heightmap':
        link.href = tile.heightmap.url // Assuming heightmap object has url
        break
      case 'landcover texture':
        link.href = tile.texture // Assuming texture is a direct url
        break
      case 'geoTiff':
        link.download = `${tile.id}_${type}.tif`
        link.href = tile.geoTiff // Assuming geoTiff is a direct url
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

const TileCoverInfo = ({ tile }) => {
  if (!tile) return null // Add guard clause for missing tile

  return (
    <div>
      <Flex gap="md">
        <ImageComponent
          src={tile.satellite}
          w={256}
          h={256}
          radius={8}
          fallbackSrc={`${URL}/images/loading.png`}
        />
        <ImageComponent
          src={tile.heightmap?.url} // Optional chaining for safety
          w={256}
          h={256}
          radius={8}
          key={`HM_${tile.id}_${new Date().getTime()}`} // More stable key
          fallbackSrc={`${URL}/images/loading.png`}
        />
        <Flex direction="column" gap="md">
          <Text>Download textures:</Text>
          {/* Ensure tile properties exist before rendering buttons */}
          {tile.heightmap && <DownloadButton type="heightmap" tile={tile} />}
          {tile.landcover && <DownloadButton type="landcover" tile={tile} />}
          {tile.texture && (
            <DownloadButton type="landcover texture" tile={tile} />
          )}
          {tile.geoTiff && <DownloadButton type="geoTiff" tile={tile} />}
        </Flex>
      </Flex>
    </div>
  )
}

export default TileCoverInfo
