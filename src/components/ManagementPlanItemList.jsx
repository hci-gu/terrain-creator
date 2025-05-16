import { Stack, Text, Box } from '@mantine/core'
import ItemList from './ItemList'

export const ManagementPlanItemList = ({ 
  managementPlans, 
  selectedPlanId, 
  onSelect, 
  onDelete, 
  onCreatePlan 
}) => {
  const renderPlanContent = (plan) => (
    <Stack>
      <Text fw={500}>{plan.name}</Text>
      <Text fz="sm" c="dimmed">
        Created: {plan.created.toLocaleDateString()}
      </Text>
    </Stack>
  )

  return (
    <ItemList
      w="30%"
      h="100%"
      miw="300px"
      style={{ overflow: 'auto' }}
      items={managementPlans}
      selectedId={selectedPlanId}
      onSelect={onSelect}
      onDelete={onDelete}
      renderItemContent={renderPlanContent}
      title="Management Plans"
      buttonLabel="New Plan"
      onButtonClick={onCreatePlan}
    />
  )
} 