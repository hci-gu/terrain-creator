import { Stack, Text } from '@mantine/core'
import ItemList from './ItemList'

export const SimulationItemList = ({
  simulations,
  selectedSimulationId,
  onSelect,
  onDelete,
  onCreateSimulation,
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
      items={simulations}
      selectedId={selectedSimulationId}
      onSelect={onSelect}
      onDelete={onDelete}
      renderItemContent={renderSimulationContent}
      title="Simulations"
      buttonLabel="New Simulation"
      onButtonClick={onCreateSimulation}
    />
  )
}

export default SimulationItemList
