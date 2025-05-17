import { config } from './config'
import {
  Button,
  Container,
  Flex,
  Box,
  Text,
  Stack,
  Paper,
  Group,
  Title,
  Tooltip,
} from '@mantine/core'
import { format } from 'date-fns'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  getManagementPlanByIdAtom,
  updateManagementPlanTaskAtom,
  deleteManagementPlanTaskAtom,
  addManagementPlanTaskAtom,
} from '@state'
import { useState } from 'react'
import LandcoverEditForm from './LandcoverEditForm'

export const ManagementPlanView = ({ id_managementPlan }) => {
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

  // Determine the display year
  let displayYear
  if (currentTasks.length > 0) {
    const earliestTaskDate = new Date(
      Math.min(...currentTasks.map((task) => new Date(task.start)))
    )
    displayYear = earliestTaskDate.getFullYear()
  } else {
    displayYear = new Date().getFullYear()
  }

  const timelineMinDate = new Date(displayYear, 0, 1) // January 1st
  const timelineMaxDate = new Date(displayYear + 1, 0, 1) // January 1st of next year (for duration calc)
  const actualTimelineEndDate = new Date(displayYear, 11, 31, 23, 59, 59) // Dec 31st for clamping tasks

  const timelineDuration = timelineMaxDate.getTime() - timelineMinDate.getTime()

  const getMonthMarkers = () => {
    const markers = []
    for (let i = 0; i < 12; i++) {
      markers.push(new Date(displayYear, i, 1))
    }
    return markers
  }

  const monthMarkers = getMonthMarkers()

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
    if (task.type === 'landcoverEdit') {
      setEditingTask(task)
    }
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
      const currentEditingTask = data // This is the task from which 'create' was clicked
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
        <Title order={3}>{managementPlan.name}</Title>

        {/* Timeline Container */}
        <Box
          w="100%"
          h="100%"
          miw={20000} // Default width for the timeline
          style={{
            border: '1px solid #ccc', // Visual for timeline track
            position: 'relative', // For absolute positioning of tasks
            overflowX: 'auto', // Allow horizontal scrolling if tasks exceed width
            backgroundColor: '#f9f9f9', // Light background for the timeline
          }}
        >
          {/* Render Month Markers */}
          {monthMarkers.map((markerDate, index) => {
            const markerPosition =
              timelineDuration > 0
                ? ((markerDate.getTime() - timelineMinDate.getTime()) /
                    timelineDuration) *
                  100
                : 0

            // Ensure marker is within the 0-100% range (should always be, but good practice)
            // if (markerPosition < 0 || markerPosition >= 100) {
            //   // Use >= 100 for last marker edge case
            //   return null
            // }

            return (
              <Box
                key={`marker-${index}`}
                style={{
                  position: 'absolute',
                  left: `${markerPosition}%`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  backgroundColor: '#e0e0e0', // Lighter line for month markers
                  zIndex: 1, // Below tasks
                }}
              >
                <Text
                  fz="xs"
                  c="dimmed"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {format(markerDate, 'MMM yyyy')}
                </Text>
              </Box>
            )
          })}

          <Group
            gap="lg"
            wrap="nowrap"
            style={{
              position: 'relative',
              height: '100%',
              zIndex: 2 /* Above markers */,
            }}
          >
            {currentTasks.map((task) => {
              const taskStart = new Date(task.start)
              let taskEnd = new Date(task.end)

              // Clamp task dates to the timeline's year
              const clampedTaskStart = new Date(
                Math.max(taskStart, timelineMinDate)
              )
              const clampedTaskEnd = new Date(
                Math.min(taskEnd, actualTimelineEndDate)
              )

              // Ensure start is not after end after clamping
              if (clampedTaskStart > clampedTaskEnd) {
                return null // Or handle as zero-duration task at start
              }

              const taskDuration =
                clampedTaskEnd.getTime() - clampedTaskStart.getTime()

              const leftPercentage =
                timelineDuration > 0
                  ? ((clampedTaskStart.getTime() - timelineMinDate.getTime()) /
                      timelineDuration) *
                    100
                  : 0
              const widthPercentage =
                timelineDuration > 0
                  ? (taskDuration / timelineDuration) * 100
                  : 0

              // Skip rendering if task is outside the timeline year or has no duration after clamping
              if (
                taskEnd < timelineMinDate ||
                taskStart > actualTimelineEndDate ||
                widthPercentage <= 0
              ) {
                return null
              }

              return (
                <Tooltip
                  key={task.id}
                  label={
                    <Stack gap="xs">
                      <Text fw={600}>{task.text}</Text>
                      <Text fz="sm">
                        Start: {format(clampedTaskStart, 'MMM d, yyyy')}
                      </Text>
                      <Text fz="sm">
                        End: {format(clampedTaskEnd, 'MMM d, yyyy')}
                      </Text>
                      {task.type === 'landcoverEdit' && (
                        <Text fz="sm" c="blue">
                          Landcover Type: {task.mapLandcoverType}
                        </Text>
                      )}
                    </Stack>
                  }
                  withArrow
                  position="bottom"
                >
                  <Paper
                    shadow="xl"
                    withBorder
                    p="md"
                    onClick={() => handleTaskClick(task)}
                    style={{
                      cursor: 'pointer',
                      position: 'absolute', // Crucial for timeline positioning
                      left: `${leftPercentage}%`,
                      width: `${widthPercentage}%`,
                      // minWidth: '250px',
                      height: '70%', // Adjusted height to make space for month labels
                      top: '15%', // Adjusted top to center with new height
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={600} truncate>
                        {task.text}
                      </Text>
                    </Group>
                  </Paper>
                </Tooltip>
              )
            })}
          </Group>
        </Box>
      </Stack>
      {editingTask && (
        <LandcoverEditForm
          key={editingTask.id}
          task={editingTask}
          tasks={currentTasks}
          onAction={handleFormAction}
        />
      )}
    </Box>
  )
}
