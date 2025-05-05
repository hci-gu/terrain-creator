import React from 'react';
import { SimpleGrid, Box, Text } from '@mantine/core';
import { landcoverTypes } from '@constants/landcover'

export const LandcoverSwatches = ({ selectedType, onSelect }) => {
  return (
    <SimpleGrid cols={3} spacing="xs" verticalSpacing="xs">
      {Object.entries(landcoverTypes).map(([key, type]) => (
        <Box key={key} ta="center">
          <Box
            w={40}
            h={40}
            mx="auto"
            style={{
              backgroundColor: type.color,
              borderRadius: 'var(--mantine-radius-md)',
              cursor: 'pointer',
              border:
                selectedType?.name === type.name
                  ? '2px solid var(--mantine-color-blue-6)'
                  : '1px solid var(--mantine-color-gray-3)',
              transition: 'transform 150ms ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
            onClick={() => onSelect(type)}
            aria-label={type.name}
          />
          <Text size="sm" fw={500} mt="xs">
            {type.name}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  )
};

export default LandcoverSwatches;