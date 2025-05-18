import {
  Container,
  Box,
  Text,
  Stack,
  Paper,
  Group,
  Tooltip,
  Image,
} from '@mantine/core'
import { format } from 'date-fns'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  getManagementPlanByIdAtom,
  updateManagementPlanTaskAtom,
  deleteManagementPlanTaskAtom,
  addManagementPlanTaskAtom,
} from '@state'
import { useState, useEffect, useRef } from 'react'
import LandcoverEditForm from './LandcoverEditForm'

const TimelineTaskItem = ({
  task,
  tile,
  leftPercentage,
  widthPercentage,
  clampedTaskStart,
  clampedTaskEnd,
  handleTaskClick,
}) => {
  return (
    <Tooltip
      label={
        <Stack gap="xs">
          <Text fw={600}>{task.text}</Text>
          <Text fz="sm">Start: {format(clampedTaskStart, 'MMM d, yyyy')}</Text>
          <Text fz="sm">End: {format(clampedTaskEnd, 'MMM d, yyyy')}</Text>
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
        h="80%"
        w={`${widthPercentage}%`}
        left={`${leftPercentage}%`}
        pos="absolute"
        p="xs"
        style={{
          cursor: 'pointer',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        onClick={() => handleTaskClick(task)}
      >
        <Stack h="100%" justify="flex-start" gap="xs">
          <Box>
            <Text fz="xl" fw={600} truncate>
              {task.text}
            </Text>
            {task.type === 'landcoverEdit' && (
              <Text fz="xs" c="blue" truncate>
                LC Type: {task.mapLandcoverType}
              </Text>
            )}
          </Box>
          {tile?.landcover?.url && (
            <Box
              style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Image
                src={tile.landcover.url}
                alt={task.text}
                w="100%"
                maw="512px"
                mah="100%"
                fit="cover"
                radius="sm"
              />
            </Box>
          )}
        </Stack>
      </Paper>
    </Tooltip>
  )
}

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

  const timelineContainerRef = useRef(null)

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

  // Setup horizontal scrolling
  useEffect(() => {
    const timelineElement = timelineContainerRef.current

    if (timelineElement) {
      const handleWheelScroll = (event) => {
        if (event.deltaY !== 0) {
          event.preventDefault()
          timelineElement.scrollLeft -= event.deltaY
        }
        if (event.deltaX !== 0) {
          timelineElement.scrollLeft -= event.deltaX
        }
      }

      timelineElement.addEventListener('wheel', handleWheelScroll, {
        passive: false,
      })

      return () => {
        timelineElement.removeEventListener('wheel', handleWheelScroll, {
          passive: false,
        })
      }
    }
  }, [])

  return (
    <Box w="100%" h="100%" miw="750">
      <Stack gap="xs" h="100%">
        <Box
          ref={timelineContainerRef}
          style={{
            flexGrow: 1,
            overflowX: 'auto',
          }}
        >
          <Box w="20000px" h="100%" pos="relative">
            <Group
              h={50}
              gap={0}
              style={{ position: 'relative', borderBottom: '1px solid #eee' }}
            >
              {monthMarkers.map((markerDate, index) => {
                const markerPositionPercent =
                  timelineDuration > 0
                    ? ((markerDate.getTime() - timelineMinDate.getTime()) /
                        timelineDuration) *
                      100
                    : 0
                return (
                  <Text
                    key={`label-${index}`}
                    fz="xl"
                    fw={600}
                    c="dimmed"
                    style={{
                      position: 'absolute',
                      left: `${markerPositionPercent}%`,
                      paddingLeft: '4px',
                      userSelect: 'none',
                    }}
                  >
                    {format(markerDate, 'MMMM')}
                  </Text>
                )
              })}
            </Group>

            <Box
              h={'calc(100% - 50px)'}
              style={{
                position: 'relative',
                backgroundColor: '#f9f9f9',
              }}
            >
              {monthMarkers.map((markerDate, index) => {
                const markerPositionPercent =
                  timelineDuration > 0
                    ? ((markerDate.getTime() - timelineMinDate.getTime()) /
                        timelineDuration) *
                      100
                    : 0

                return (
                  <Box
                    key={`line-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${markerPositionPercent}%`,
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      backgroundColor: '#e0e0e0',
                      zIndex: 1,
                    }}
                  />
                )
              })}

              <Group h="100%" gap="lg" wrap="nowrap" pos="relative">
                {currentTasks.map((task) => {
                  const taskStart = new Date(task.start)
                  let taskEnd = new Date(task.end)

                  const clampedTaskStart = new Date(
                    Math.max(taskStart, timelineMinDate)
                  )
                  const clampedTaskEnd = new Date(
                    Math.min(taskEnd, actualTimelineEndDate)
                  )

                  if (clampedTaskStart > clampedTaskEnd) {
                    return null
                  }

                  const taskDuration =
                    clampedTaskEnd.getTime() - clampedTaskStart.getTime()

                  const leftPercentage =
                    timelineDuration > 0
                      ? ((clampedTaskStart.getTime() -
                          timelineMinDate.getTime()) /
                          timelineDuration) *
                        100
                      : 0
                  const widthPercentage =
                    timelineDuration > 0
                      ? (taskDuration / timelineDuration) * 100
                      : 0

                  if (
                    taskEnd < timelineMinDate ||
                    taskStart > actualTimelineEndDate ||
                    widthPercentage <= 0
                  ) {
                    return null
                  }

                  return (
                    <TimelineTaskItem
                      key={task.id}
                      task={task}
                      tile={tile}
                      leftPercentage={leftPercentage}
                      widthPercentage={widthPercentage}
                      clampedTaskStart={clampedTaskStart}
                      clampedTaskEnd={clampedTaskEnd}
                      handleTaskClick={handleTaskClick}
                    />
                  )
                })}
              </Group>
            </Box>
          </Box>
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
