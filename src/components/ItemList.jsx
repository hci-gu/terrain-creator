// src/components/ItemList.jsx
import React from 'react'
import { Card, Flex, Text, Space, Button, Stack } from '@mantine/core'
import { IconTrashFilled } from '@tabler/icons-react'

/**
 * A reusable component to display a list of items in cards,
 * supporting selection and deletion.
 *
 * @param {object[]} items - Array of items to display. Each item MUST have an 'id'.
 * @param {string|number|null} selectedId - The ID of the currently selected item.
 * @param {function(id: string|number): void} onSelect - Function called when an item card is clicked.
 * @param {function(id: string|number): void} onDelete - Function called when the delete button is clicked.
 * @param {function(item: object): React.ReactNode} renderItemContent - Function that takes an item and returns the JSX for its content within the card.
 */
const ItemList = ({
  items,
  selectedId,
  onSelect,
  onDelete,
  renderItemContent,
}) => {
  if (!items || items.length === 0) {
    return <Text c="dimmed">No items available.</Text>
  }

  return (
    <Stack gap="md" w="100%">
      {' '}
      {/* Ensure Stack takes width */}
      {items.map((item) => (
        <Card
          key={item.id}
          withBorder
          shadow="xs"
          style={
            item.id === selectedId
              ? { borderColor: '#339AF0', borderWidth: 2, cursor: 'pointer' }
              : { cursor: 'pointer' }
          }
          onClick={() => onSelect(item.id)}
          padding="sm" // Use consistent padding
        >
          <Flex align="center" justify="space-between">
            {/* Render custom content provided by the parent */}
            <div style={{ flexGrow: 1, marginRight: 'md' }}>
              {renderItemContent(item)}
            </div>

            {/* Standard Delete Button */}
            <Button
              w={48}
              pl={12}
              pr={12}
              variant="outline"
              color="red"
              onClick={(e) => {
                e.stopPropagation() // Prevent Card's onClick from firing
                onDelete(item.id)
              }}
              aria-label={`Delete item ${item.id}`} // For accessibility
            >
              <IconTrashFilled size={16} />
            </Button>
          </Flex>
        </Card>
      ))}
    </Stack>
  )
}

export default ItemList
