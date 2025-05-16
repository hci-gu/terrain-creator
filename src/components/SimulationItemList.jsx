import { Stack, Text } from '@mantine/core'
import ItemList from './ItemList'

export const SimulationItemList = ({
  simulations,
  selectedSimulationId,
  onSelect,
  onDelete,
  onCreateSimulation
}) => {
  const renderSimulationContent = (simulation) => (
    <Stack>
      <Text fw={500}>{simulation.created.toLocaleDateString()}</Text>
      <Text fz="sm" c="dimmed">
        {simulation.created
          .toLocaleTimeString()
          .split(':')
          .map((part, i) => (
            <span key={i} style={{ fontSize: i === 2 ? '0.8em' : 'inherit' }}>
              {i > 0 ? ':' : ''}
              {part}
            </span>
          ))}
      </Text>
    </Stack>
  )

  return (
    <ItemList
      w="30%"
      h="100%"
      miw="300px"
      style={{ overflow: 'auto' }}
      items={simulations}
      selectedId={selectedSimulationId}
      onSelect={onSelect}
      onDelete={onDelete}
      renderItemContent={renderSimulationContent}
      title="Simulation History"
      buttonLabel="Run New Simulation"
      onButtonClick={onCreateSimulation}
    />
  )
}

export default SimulationItemList 