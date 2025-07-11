import React from 'react'
import {
  Card,
  Text,
  Button,
  Stack,
  Group,
  Box,
  Flex,
  Divider,
} from '@mantine/core'
import { IconTrashFilled } from '@tabler/icons-react'

const ItemList = ({
  items,
  selectedId,
  onSelect,
  onDelete,
  renderItemContent,
  title,
  buttonLabel,
  onButtonClick,
}) => {
  return (
    <Stack gap="md" w="100%" h="100%" wrap="nowrap">
      <Group gap="xs" justify="space-between">
        {title && (
          <Text size="xl" fw={500} truncate>
            {title}
          </Text>
        )}
        {buttonLabel && onButtonClick && (
          <Button variant="filled" onClick={onButtonClick} size="xs">
            {buttonLabel}
          </Button>
        )}
      </Group>
      <Divider />
      <Box gap="xs" w="100%" style={{ overflowY: 'auto' }}>
        {!items || items.length === 0 ? (
          <Flex justify="center" align="center" h="100%">
            <Text c="dimmed">No items available.</Text>
          </Flex>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              mb="xs"
              withBorder
              shadow="xs"
              flex="auto"
              p="sm"
              style={{
                ...(item.id === selectedId
                  ? {
                      borderColor: '#339AF0',
                      borderWidth: 2,
                      cursor: 'pointer',
                    }
                  : { cursor: 'pointer' }),
              }}
              onClick={() => onSelect(item.id)}
            >
              <Flex justify="space-between" align="center" gap="xs">
                {renderItemContent(item)}
                <Button
                  w={48}
                  pl={12}
                  pr={12}
                  variant="outline"
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(item.id)
                  }}
                  aria-label={`Delete item ${item.id}`}
                >
                  <IconTrashFilled size={16} />
                </Button>
              </Flex>
            </Card>
          ))
        )}
      </Box>
    </Stack>
  )
}

export default ItemList
