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
import LandcoverEditForm from './LandcoverEditForm'
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

  // All timeline-specific logic (refs, state, effects, constants) has been moved to Timeline.jsx
  // timelineContainerRef, timelineVisualWidth, ZOOM_SPEED_FACTOR, zoomAnchorRef
  // useEffect for scrolling/zooming
  // useEffect for adjusting scroll after zoom

  const currentTasks = managementPlan?.tasks || []

  // Logic for displayYear, timelineMinDate, timelineMaxDate, actualTimelineEndDate, timelineDuration
  // getMonthMarkers function and monthMarkers variable have been moved to Timeline.jsx

  if (!managementPlan) {
    return (
      <Container fluid>
        <Text c="dimmed">No management plan selected</Text>
      </Container>
    )
  }

  // The check for currentTasks length is now implicitly handled by Timeline or can be added as a wrapper if needed.
  // However, Timeline component itself handles empty tasks gracefully by calculating a default displayYear.
  // It might be better to show a message if currentTasks is empty before rendering the Timeline.
  if (!currentTasks || currentTasks.length === 0) {
    return (
      <Container fluid>
        <Text c="dimmed">No tasks available for this management plan</Text>
      </Container>
    )
  }

  const handleTaskClick = (task) => {
    if (task.type === 'landcoverEdit') {
      setEditingTask(task)
    }
    // Other task click logic can remain here if it doesn't directly manipulate timeline display
  }

  const handleFormAction = (actionType, data) => {
    if (actionType === 'update') {
      console.log('Update task:', data)
      updateTask({
        managementPlan: managementPlan,
        taskToUpdateId: data.id,
        taskToUpdateData: data.task,
      })
      setEditingTask(null)
    } else if (actionType === 'delete') {
      deleteTask({
        managementPlan: managementPlan,
        taskToDeleteId: data.id,
      })
      setEditingTask(null)
    } else if (actionType === 'changeTask') {
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
        <LandcoverEditForm
          key={editingTask.id} // Ensure key is stable if editingTask can change but represent the same conceptual item
          task={editingTask}
          tasks={currentTasks} // Pass currentTasks for context if needed by the form (e.g., for validation)
          onAction={handleFormAction}
        />
      )}
    </Box>
  )
}
