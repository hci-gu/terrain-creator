import { data } from './data'
import { config } from './config'
import { Button, Container, Flex, useMantineColorScheme, Box, Text, Stack } from '@mantine/core'
import { format } from 'date-fns'
import { useAtomValue } from 'jotai'
import { getManagementPlanByIdAtom } from '@state'

export const ManagementPlanCustomView = ({ id_managementPlan }) => {
  if (id_managementPlan === null || id_managementPlan === undefined) {
    return null
  }

  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const managementPlan = useAtomValue(getManagementPlanByIdAtom(id_managementPlan))

  if (!managementPlan) {
    return (
      <Container fluid>
        <Text c="dimmed">No management plan selected</Text>
      </Container>
    )
  }

  return (
    <Container fluid>
      <Stack gap="lg">
        <Text fz="xl" fw={700}>{managementPlan.name}</Text>
        <Box>
          {data.tasks.map((task) => (
            <Box
              key={task.id}
              p="md"
              mb="sm"
              style={{
                border: `1px solid ${isDark ? '#373A40' : '#DEE2E6'}`,
                borderRadius: '8px',
                backgroundColor: isDark ? '#25262B' : 'white',
              }}
            >
              <Stack gap="xs">
                <Text fw={600}>{task.text}</Text>
                <Flex gap="md">
                  <Text fz="sm" c="dimmed">Start: {format(task.start, 'MMM d, yyyy')}</Text>
                  <Text fz="sm" c="dimmed">End: {format(task.end, 'MMM d, yyyy')}</Text>
                </Flex>
                {task.type === 'landcoverEdit' && (
                  <Text fz="sm" c="blue">Landcover Type: {task.mapLandcoverType}</Text>
                )}
              </Stack>
            </Box>
          ))}
        </Box>
      </Stack>
    </Container>
  )
}
