import {
  Container,
  Box,
  Text,
  Stack,
  Button,
  Group,
  Center,
} from '@mantine/core'
import { useAtomValue, useSetAtom } from 'jotai'
import * as pocketbase from '@/pocketbase'
import { getManagementPlanByIdAtom, refreshManagementPlansAtom } from '@state'
import { useState } from 'react'
import TaskEditorForm from '@components/TaskEditorForm'
import { Timeline } from '@components/TaskTimeline'
import { Suspense } from 'react'
import { startTransition } from 'react'

export const ManagementPlanView = ({ tile, id }) => {
  if (id === null || id === undefined) {
    return null
  }

  const managementPlan = useAtomValue(getManagementPlanByIdAtom(id))
  const refreshPlans = useSetAtom(refreshManagementPlansAtom)
  const [editingTask, setEditingTask] = useState(null)

  const currentTasks = managementPlan?.tasks || []

  if (!managementPlan) {
    return (
      <Center h="100%">
        <Text c="dimmed">No management plan selected</Text>
      </Center>
    )
  }

  const handleTaskClick = (task) => {
    setEditingTask(task)
  }

  const handleCreateNewTask = async () => {
    if (!managementPlan) {
      console.error('Cannot create task: managementPlan is not available.')
      return
    }
    const newTask = await pocketbase.createTask(managementPlan)
    await refreshPlans()

    if (newTask) {
      setEditingTask(newTask)
    } else {
      console.error('Failed to create a new task.')
    }
  }

  const handleFormAction = (actionType, data) => {
    startTransition(async () => {
      if (actionType === 'updateTask') {
        pocketbase.updateTask(data.id, data.task)
        await refreshPlans()
        setEditingTask(null)
      } else if (actionType === 'deleteTask') {
        pocketbase.deleteTask(data.id)
        await refreshPlans()
        setEditingTask(null)
      } else if (actionType === 'changeEditingTask') {
        setEditingTask(data)
      } else if (actionType === 'createTask') {
        const newTask = await pocketbase.createTask(managementPlan)
        await refreshPlans()
        setEditingTask(newTask)
      } else {
        setEditingTask(null)
      }
    })
  }

  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <Box w="100%" h="100%">
        <Stack h="100%" gap="0">
          <Group flex="initial" wrap="nowrap">
            <input
              type="text"
              value={managementPlan.name}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                padding: 0,
                fontSize: 'var(--mantine-font-size-xl)',
                fontWeight: 500,
                textOverflow: 'ellipsis',
                flex: 1,
              }}
              onChange={(e) => {
                startTransition(async () => {
                  await pocketbase.updateManagementPlan(id, {
                    name: e.target.value,
                  })
                  refreshPlans()
                })
              }}
            />
            <Button onClick={handleCreateNewTask} disabled={!managementPlan}>
              Create New Task
            </Button>
          </Group>

          {currentTasks && currentTasks.length > 0 ? (
            <Timeline
              tasks={currentTasks}
              tile={tile}
              onTaskClick={handleTaskClick}
            />
          ) : (
            <Container
              fluid
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="dimmed">No tasks yet.</Text>
              <Text c="dimmed">Click 'Create New Task' to add one.</Text>
            </Container>
          )}
        </Stack>
        {editingTask && (
          <TaskEditorForm
            key={`TaskEditorForm_${editingTask.id}`}
            task={editingTask}
            tasks={currentTasks}
            onAction={handleFormAction}
          />
        )}
      </Box>
    </Suspense>
  )
}
