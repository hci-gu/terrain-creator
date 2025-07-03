import {
  Box,
  Text,
  Stack,
  Paper,
  Group,
  Tooltip,
  Image,
  Divider,
} from '@mantine/core'
import { format } from 'date-fns'
import { useEffect, useRef } from 'react'
import { atom, useAtom } from 'jotai'
import FishingPolicyView from '@components/FishingPolicyView'

export const timelineWidthAtom = atom(null)

const ZOOM_SPEED_FACTOR = 10
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
          <Text fw={600}>{task.name}</Text>
          <Text fz="sm">Start: {format(clampedTaskStart, 'MMM d, yyyy')}</Text>
          <Text fz="sm">End: {format(clampedTaskEnd, 'MMM d, yyyy')}</Text>
          {tile.landcover?.url && task.type === 'landcover' && (
            <Box h="100">
              <Image
                src={tile.landcover.url}
                alt={task.name}
                h="100%"
                radius="sm"
                fit="contain"
              />
            </Box>
          )}
        </Stack>
      }
      withArrow
    >
      <Paper
        shadow="xl"
        withBorder
        p="sm"
        w={`${widthPercentage}%`}
        h="200"
        left={`${leftPercentage}%`}
        pos="absolute"
        style={{
          cursor: 'pointer',
          zIndex: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={() => handleTaskClick(task)}
      >
        <Text fz="md" fw={600} truncate>
          {task.name}
        </Text>
        <Stack w="100%" gap="xs" style={{ flex: 1, minHeight: 0 }}>
          {task.type === 'fishingPolicy' && task.fishingPolicy && (
            <FishingPolicyView fishingPolicy={task.fishingPolicy} />
          )}
          {tile.landcover?.url &&
            task.type === 'landcover' &&
            widthPercentage > 1 && (
              <Box
                mih="0"
                style={{
                  display: 'flex',
                }}
              >
                <Image
                  src={tile.landcover.url}
                  alt={task.name}
                  radius="sm"
                  h="100%"
                  fit="contain"
                />
              </Box>
            )}
        </Stack>
      </Paper>
    </Tooltip>
  )
}

export const Timeline = ({ tasks, tile, onTaskClick }) => {
  const timelineContainerRef = useRef(null)
  const [timelineWidth, setTimelineWidth] = useAtom(timelineWidthAtom)
  const zoomAnchorRef = useRef(null)

  // Setup horizontal scrolling and zooming
  useEffect(() => {
    const timelineElement = timelineContainerRef.current
    if (!timelineElement) return

    const handleWheel = (event) => {
      if (event.shiftKey) {
        event.preventDefault()

        const mouseX =
          event.clientX - timelineElement.getBoundingClientRect().left
        const currentScrollLeft = timelineElement.scrollLeft
        const widthBeforeThisZoomEvent = timelineWidth

        const anchorRatio =
          widthBeforeThisZoomEvent > 0
            ? (currentScrollLeft + mouseX) / widthBeforeThisZoomEvent
            : 0

        zoomAnchorRef.current = {
          ratio: anchorRatio,
          mouseXAtZoom: mouseX,
          widthBeforeZoom: widthBeforeThisZoomEvent,
        }

        setTimelineWidth((prevActualWidth) => {
          const changeAmount = event.deltaY * ZOOM_SPEED_FACTOR
          let newCalculatedWidth = prevActualWidth - changeAmount
          const containerVisibleWidth = timelineElement.clientWidth
          return Math.max(containerVisibleWidth, newCalculatedWidth)
        })
      } else {
        if (event.deltaY !== 0) {
          event.preventDefault()
          timelineElement.scrollLeft -= event.deltaY
        }
      }
    }

    timelineElement.addEventListener('wheel', handleWheel, {
      passive: false,
    })

    return () => {
      timelineElement.removeEventListener('wheel', handleWheel, {
        passive: false,
      })
    }
  }, [timelineWidth, ZOOM_SPEED_FACTOR])

  // Effect to adjust scroll after zoom
  useEffect(() => {
    const timelineElement = timelineContainerRef.current
    if (timelineElement && zoomAnchorRef.current) {
      const { ratio, mouseXAtZoom, widthBeforeZoom } = zoomAnchorRef.current
      const newWidthAfterZoom = timelineWidth

      if (newWidthAfterZoom !== widthBeforeZoom) {
        let newScrollLeft = ratio * newWidthAfterZoom - mouseXAtZoom

        const containerVisibleWidth = timelineElement.clientWidth
        const maxScrollLeft = Math.max(
          0,
          newWidthAfterZoom - containerVisibleWidth
        )
        newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft))

        timelineElement.scrollLeft = newScrollLeft
      }
      zoomAnchorRef.current = null
    }
  }, [timelineWidth])

  let displayYear
  if (tasks.length > 0) {
    const earliestTaskDate = new Date(
      Math.min(...tasks.map((task) => new Date(task.start)))
    )
    displayYear = earliestTaskDate.getFullYear()
  } else {
    displayYear = new Date().getFullYear()
  }

  const timelineMinDate = new Date(displayYear, 0, 1)
  const timelineMaxDate = new Date(displayYear + 1, 0, 1)
  const actualTimelineEndDate = new Date(displayYear, 11, 31, 23, 59, 59)
  const timelineDuration = timelineMaxDate.getTime() - timelineMinDate.getTime()

  const getMonthMarkers = () => {
    const markers = []
    for (let i = 0; i < 12; i++) {
      markers.push(new Date(displayYear, i, 1))
    }
    return markers
  }

  const monthMarkers = getMonthMarkers()

  return (
    <Box
      ref={timelineContainerRef}
      flex="auto"
      style={{
        overflowX: 'scroll',
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      <Box w={`${timelineWidth}px`} h="100%" pos="relative">
        <Group h="30" gap="0" pos="relative">
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
                fz="sm"
                fw={600}
                c="dimmed"
                pos="absolute"
                left={`${markerPositionPercent}%`}
                pl="4px"
              >
                {format(markerDate, 'MMMM')}
              </Text>
            )
          })}
        </Group>

        <Box
          h={'calc(100% - 30px)'}
          // h="100%"
          pos="relative"
          sx={(theme) => ({
            backgroundColor:
              theme.colorScheme === 'dark'
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
          })}
        >
          {monthMarkers.map((markerDate, index) => {
            const markerPositionPercent =
              timelineDuration > 0
                ? ((markerDate.getTime() - timelineMinDate.getTime()) /
                    timelineDuration) *
                  100
                : 0

            return (
              <Divider
                key={`line-${index}`}
                orientation="vertical"
                size="xs"
                pos="absolute"
                left={`${markerPositionPercent}%`}
                top="0"
                bottom="0"
                style={{
                  zIndex: 1,
                }}
              />
            )
          })}

          <Group h="100%" gap="lg" wrap="nowrap" pos="relative">
            {tasks.map((task) => {
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
                  ? ((clampedTaskStart.getTime() - timelineMinDate.getTime()) /
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
                  handleTaskClick={onTaskClick}
                />
              )
            })}
          </Group>
        </Box>
      </Box>
    </Box>
  )
}
