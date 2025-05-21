import React from 'react'
import { Text, Slider, Space, Box, Stack } from '@mantine/core'

const FishingPolicyView = ({
  fishingPolicy,
  onFishingPolicyChange = () => {},
}) => {
  if (!fishingPolicy) {
    return null
  }
  return (
    <Stack h="100%" w="100%" gap="0">
      <Text fz="h4" fw={500} truncate>
        Fishing Amounts
      </Text>
      <Box
        w="100%"
        h="100%"
        flex="auto"
        style={{ overflowY: 'auto', overflowX: 'hidden' }}
      >
        {Object.entries(fishingPolicy).map(([species, amount]) => (
          <Box
            key={`fishing_${species}`}
          >
            <Text>{"% " + species.charAt(0).toUpperCase() + species.slice(1)}</Text>
            <Slider
              value={amount}
              onChange={(value) => onFishingPolicyChange(species, value)}
              min={0}
              max={10}
              step={0.01}
              label={(value) => `${value.toFixed(2)}%`}
              marks={[
                { value: 0, label: '0' },
                { value: 2.5, label: '2.5' },
                { value: 5, label: '5' },
                { value: 7.5, label: '7.5' },
                { value: 10, label: '10' },
              ]}
            />
            <Space h="md" />
          </Box>
        ))}
      </Box>
    </Stack>
  )
}

export default FishingPolicyView
