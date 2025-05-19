import {
  Container,
  Box,
  Text,
  Stack,
  Button,
  Group,
  Title,
  TextInput,
} from '@mantine/core'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  getManagementPlanByIdAtom,
  updateManagementPlanTaskAtom,
  deleteManagementPlanTaskAtom,
  addManagementPlanTaskAtom,
  updateManagementPlanNameAtom,
} from '@state'
import { useState } from 'react'
import TaskEditorForm from './TaskEditorForm'
import { Timeline } from './TaskTimeline'

export const ManagementPlanView = ({ tile, id_managementPlan }) => {
  if (id_managementPlan === null || id_managementPlan === undefined) {
    return null
  }

  const managementPlan = useAtomValue(
    getManagementPlanByIdAtom(id_managementPlan)
  )
  const updateTask = useSetAtom(updateManagementPlanTaskAtom)
  const deleteTask = useSetAtom(deleteManagementPlanTaskAtom)
  const addTask = useSetAtom(addManagementPlanTaskAtom)
  const updatePlanName = useSetAtom(updateManagementPlanNameAtom)
  const [editingTask, setEditingTask] = useState(null)

  const currentTasks = managementPlan?.tasks || []

  if (!managementPlan) {
    return (
      <Container fluid>
        <Text c="dimmed">No management plan selected</Text>
      </Container>
    )
  }

  const handleTaskClick = (task) => {
    setEditingTask(task)
  }

  const handleCreateNewTask = () => {
    if (!managementPlan) {
      console.error('Cannot create task: managementPlan is not available.')
      return
    }
    const newTask = addTask({
      managementPlan: managementPlan,
      previousTask: null,
    })
    if (newTask) {
      setEditingTask(newTask)
    } else {
      console.error('Failed to create a new task.')
    }
  }

  const handleFormAction = (actionType, data) => {
    if (actionType === 'updateTask') {
      console.log('Update task:', data)
      updateTask({
        managementPlan: managementPlan,
        taskToUpdateId: data.id,
        taskToUpdateData: data.task,
      })
      setEditingTask(null)
    } else if (actionType === 'deleteTask') {
      deleteTask({
        managementPlan: managementPlan,
        taskToDeleteId: data.id,
      })
      setEditingTask(null)
    } else if (actionType === 'changeEditingTask') {
      setEditingTask(data)
    } else if (actionType === 'createTask') {
      const currentEditingTask = data
      const newTask = addTask({
        managementPlan: managementPlan,
        previousTask: currentEditingTask,
      })
      setEditingTask(newTask)
    } else {
      setEditingTask(null)
    }
  }

  return (
    <Box w="100%" h="100%" miw={750}>
      <Stack gap="md" h="100%">
        <Group position="right" py="sm">
          <Button onClick={handleCreateNewTask} disabled={!managementPlan}>
            Create New Task
          </Button>
          <TextInput
            value={managementPlan.name}
            onChange={(e) =>
              updatePlanName({ managementPlan, newName: e.target.value })
            }
            variant="unstyled"
            size="xl"
            fz="xl"
            fw={500}
            flex="auto"
          />
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
          key={editingTask.id}
          task={editingTask}
          tasks={currentTasks}
          onAction={handleFormAction}
        />
      )}
    </Box>
  )
}
