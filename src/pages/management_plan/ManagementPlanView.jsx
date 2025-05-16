import { config } from './config'
import {
  Button,
  Container,
  Flex,
  useMantineColorScheme,
  Box,
  Text,
  Stack,
  Paper,
  Group,
} from '@mantine/core'
import { format } from 'date-fns'
import { useAtomValue } from 'jotai'
import { getManagementPlanByIdAtom } from '@state'
import { useState, useEffect } from 'react'

export const ManagementPlanView = ({ id_managementPlan }) => {
  if (id_managementPlan === null || id_managementPlan === undefined) {
    return null
  }

  const { colorScheme } = useMantineColorScheme()
  const managementPlan = useAtomValue(
    getManagementPlanByIdAtom(id_managementPlan)
  )
  const [taskToEdit, setTaskToEdit] = useState(null)
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    if (managementPlan?.tasks) {
      setTasks(managementPlan.tasks)
    }
  }, [managementPlan])

  if (!managementPlan) {
    return (
      <Container fluid>
        <Text c="dimmed">No management plan selected</Text>
      </Container>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Container fluid>
        <Text c="dimmed">No tasks available for this management plan</Text>
      </Container>
    )
  }

  return (
    <Box w="100%" h="100%" miw="750">
      <Stack gap="xs">
        <Text fz="xl" fw={700}>
          {managementPlan.name}
        </Text>

        <Group gap="lg" wrap="nowrap">
          {tasks.map((task) => (
            <Paper key={task.id} shadow="xl" withBorder p="md">
              <Group gap="xs">
                <Text fw={600}>{task.text}</Text>
                <Text fz="sm" c="dimmed">
                  Start: {format(task.start, 'MMM d, yyyy')}
                </Text>
                <Text fz="sm" c="dimmed">
                  End: {format(task.end, 'MMM d, yyyy')}
                </Text>
                {task.type === 'landcoverEdit' && (
                  <Text fz="sm" c="blue">
                    Landcover Type: {task.mapLandcoverType}
                  </Text>
                )}
              </Group>
            </Paper>
          ))}
        </Group>
      </Stack>
    </Box>
  )
}
