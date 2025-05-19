import React from 'react'
import { Card, Text, Button, Stack, Group } from '@mantine/core'
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
    <Stack gap="md" w="100%" h="100%">
      <Group gap="xs" pr="md" justify="space-between">
        {title && (
          <Text size="xl" fw={500} truncate>
            {title}
          </Text>
        )}
        {buttonLabel && onButtonClick && (
          <Button variant="filled" onClick={onButtonClick}>
            {buttonLabel}
          </Button>
        )}
      </Group>
      <Group
        gap="xs"
        w="100%"
        justify="space-between"
        style={{ overflowY: 'auto' }}
      >
        {!items || items.length === 0 ? (
          <Text c="dimmed">No items available.</Text>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
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
            </Card>
          ))
        )}
      </Group>
    </Stack>
  )
}

export default ItemList
