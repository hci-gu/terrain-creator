import React from 'react'
import { Paper, Text, Slider, Space, Box } from '@mantine/core'

const FishingPolicyView = ({
  fishingPolicy,
  onFishingPolicyChange = () => {},
}) => {
  if (!fishingPolicy) {
    return null // Or some fallback UI
  }
  return (
    <Paper withBorder p="md" h="100%">
      <Text fw={500} mb="sm">
        Fishing Amounts
      </Text>
      {Object.entries(fishingPolicy).map(([species, amount]) => (
        <Box key={`fishing_${species}`}>
          <Text>{species.charAt(0).toUpperCase() + species.slice(1)}</Text>
          <Space h="xs" />
          <Slider
            value={amount}
            onChange={(value) => onFishingPolicyChange(species, value)}
            min={0}
            max={10}
            step={0.01}
            label={(value) => `${value.toFixed(2)}%`}
            marks={[
              { value: 0, label: '0%' },
              { value: 2.5, label: '2.5%' },
              { value: 5, label: '5%' },
              { value: 7.5, label: '7.5%' },
              { value: 10, label: '10%' },
            ]}
          />
          <Space h="md" />
        </Box>
      ))}
    </Paper>
  )
}

export default FishingPolicyView
