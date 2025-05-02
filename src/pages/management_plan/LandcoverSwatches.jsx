import React from 'react';
import { capitalize } from 'lodash';
import { SimpleGrid, Box, Text, Title } from '@mantine/core';

const landcoverTypes = [
  { name: 'water', color: '#419BDF' },
  { name: 'trees', color: '#397D49' },
  { name: 'grass', color: '#88B053' },
  { name: 'shrub', color: '#DFC35A' },
  { name: 'crops', color: '#E49635' },
  { name: 'built', color: '#C4281B' },
  { name: 'bare', color: '#5e6572' },
  { name: 'snow', color: '#B39FE1' },
  { name: 'flooded vegetation', color: '#7A87C6' },
];

export const LandcoverSwatches = ({ selectedType, onSelect }) => {
  return (
    <Box>
      <SimpleGrid cols={3} spacing="md">
        {landcoverTypes.map((type) => (
          <Box key={type.name} ta="center">
            <Box
              w={40}
              h={40}
              mx="auto"
              style={{
                backgroundColor: type.color,
                borderRadius: 'var(--mantine-radius-md)',
                cursor: 'pointer',
                border: selectedType === type.name 
                  ? '2px solid var(--mantine-color-blue-6)'
                  : '1px solid var(--mantine-color-gray-3)',
                transition: 'transform 150ms ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
              onClick={() => onSelect(type.name)}
              aria-label={type.name}
            />
            <Text size="sm" fw={500} mt="xs">
              {capitalize(type.name)}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default LandcoverSwatches;