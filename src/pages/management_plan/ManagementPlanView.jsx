import {
  Container,
  Box,
  Text,
  Stack,
  // Paper,
  // Group,
  // Tooltip,
  // Image,
  // Divider,
} from '@mantine/core'
// import { format } from 'date-fns'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  getManagementPlanByIdAtom,
  updateManagementPlanTaskAtom,
  deleteManagementPlanTaskAtom,
  addManagementPlanTaskAtom,
} from '@state'
import { useState } from 'react' // Removed useEffect, useRef
import TaskEditorForm from './TaskEditorForm'
import { Timeline } from './Timeline' // Import the new Timeline component

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
  const [editingTask, setEditingTask] = useState(null)

  const currentTasks = managementPlan?.tasks || []

  if (!managementPlan) {
    return (
      <Container fluid>
        <Text c="dimmed">No management plan selected</Text>
      </Container>
    )
  }

  if (!currentTasks || currentTasks.length === 0) {
    return (
      <Container fluid>
        <Text c="dimmed">No tasks available for this management plan</Text>
      </Container>
    )
  }

  const handleTaskClick = (task) => {
    setEditingTask(task)
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
    <Box w="100%" h="100%" miw="750">
      <Stack gap="xs" h="100%">
        <Timeline
          tasks={currentTasks}
          tile={tile}
          onTaskClick={handleTaskClick}
        />
      </Stack>
      {editingTask && (
        <TaskEditorForm
          key={editingTask.id} // Ensure key is stable if editingTask can change but represent the same conceptual item
          task={editingTask}
          tasks={currentTasks} // Pass currentTasks for context if needed by the form (e.g., for validation)
          onAction={handleFormAction}
        />
      )}
    </Box>
  )
}
