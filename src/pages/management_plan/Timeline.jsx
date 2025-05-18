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
import { useState, useEffect, useRef } from 'react'

const MIN_IMAGE_SIZE = 200 // pixels
const MIN_TIMELINE_SIZE = 4500 // pixels
const TimelineTaskItem = ({
  task,
  tile,
  leftPercentage,
  widthPercentage,
  clampedTaskStart,
  clampedTaskEnd,
  handleTaskClick,
  dynamicImageSize, // Added prop
}) => {
  const paperRef = useRef(null)
  const [paperWidth, setPaperWidth] = useState(0)

  useEffect(() => {
    const currentPaperElement = paperRef.current
    if (currentPaperElement) {
      const observer = new ResizeObserver((entries) => {
        if (entries && entries.length > 0) {
          const newWidth = entries[0].contentRect.width
          setPaperWidth(newWidth)
        }
      })
      observer.observe(currentPaperElement)
      // Initial width check
      setPaperWidth(currentPaperElement.getBoundingClientRect().width)
      return () => {
        observer.unobserve(currentPaperElement)
      }
    }
  }, [])

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
        ref={paperRef}
        shadow="xl"
        withBorder
        // h="50%"
        w={`${widthPercentage}%`}
        left={`${leftPercentage}%`}
        pos="absolute"
        // p="xs"
        style={{
          cursor: 'pointer',
          zIndex: 2,
          overflow: 'hidden',
        }}
        onClick={() => handleTaskClick(task)}
      >
        <Stack w="100%" h="100%" gap="xs" align="flex-start">
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
          {/* {tile?.landcover?.url &&
            dynamicImageSize > 0 &&
            paperWidth >= dynamicImageSize && ( */}
          {tile?.landcover?.url && (
            <Box>
              <Image
                src={tile.landcover.url}
                alt={task.text}
                // h={widthPercentage * 10}
                // h={dynamicImageSize}
                h={dynamicImageSize}
                // w={dynamicImageSize}
                // maw="100%"
                // mah="100%"
                radius="sm"
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
  const [timelineVisualWidth, setTimelineVisualWidth] = useState(null)
  const ZOOM_SPEED_FACTOR = 20
  const zoomAnchorRef = useRef(null)

  useEffect(() => {
    // Initialize timelineVisualWidth based on container width if not already set
    if (timelineContainerRef.current && timelineVisualWidth === null) {
      setTimelineVisualWidth(timelineContainerRef.current.clientWidth)
    }
  }, [timelineVisualWidth])

  // Setup horizontal scrolling and zooming
  useEffect(() => {
    const timelineElement = timelineContainerRef.current
    if (!timelineElement) return

    const handleWheel = (event) => {
      if (event.ctrlKey) {
        event.preventDefault()

        const mouseX =
          event.clientX - timelineElement.getBoundingClientRect().left
        const currentScrollLeft = timelineElement.scrollLeft
        const widthBeforeThisZoomEvent = timelineVisualWidth

        const anchorRatio =
          widthBeforeThisZoomEvent > 0
            ? (currentScrollLeft + mouseX) / widthBeforeThisZoomEvent
            : 0

        zoomAnchorRef.current = {
          ratio: anchorRatio,
          mouseXAtZoom: mouseX,
          widthBeforeZoom: widthBeforeThisZoomEvent,
        }

        setTimelineVisualWidth((prevActualWidth) => {
          const changeAmount = event.deltaY * ZOOM_SPEED_FACTOR
          let newCalculatedWidth = prevActualWidth - changeAmount
          const containerVisibleWidth = timelineElement.clientWidth
          return Math.max(containerVisibleWidth, newCalculatedWidth)
        })
      } else {
        if (event.deltaY !== 0) {
          event.preventDefault()
          timelineElement.scrollLeft -= event.deltaY // Note: Scroll direction might need adjustment based on UX preference
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
  }, [timelineVisualWidth, ZOOM_SPEED_FACTOR])

  // Effect to adjust scroll after zoom
  useEffect(() => {
    const timelineElement = timelineContainerRef.current
    if (timelineElement && zoomAnchorRef.current) {
      const { ratio, mouseXAtZoom, widthBeforeZoom } = zoomAnchorRef.current
      const newWidthAfterZoom = timelineVisualWidth

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
  }, [timelineVisualWidth])

  // Determine the display year
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

  const dynamicImageSize = Math.max(
    MIN_IMAGE_SIZE,
    Math.floor(timelineVisualWidth / 100)
  )

  return (
    <Box
      ref={timelineContainerRef}
      style={{
        flexGrow: 1,
        overflowX: 'scroll',
        // width: '100%', // Ensure it takes available width
        // height: '100%', // Ensure it takes available height
      }}
    >
      <Box
        // w={`${timelineVisualWidth}px`}
        style={{
          width: timelineVisualWidth ? `${timelineVisualWidth}px` : '100%',
          // minWidth: MIN_TIMELINE_SIZE,
        }}
        h="100%"
        pos="relative"
      >
        <Group h={50} gap={0} style={{ position: 'relative' }}>
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
          sx={(theme) => ({
            backgroundColor:
              theme.colorScheme === 'dark'
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
            position: 'relative',
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
                style={{
                  position: 'absolute',
                  left: `${markerPositionPercent}%`,
                  top: 0,
                  bottom: 0,
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
                  dynamicImageSize={dynamicImageSize}
                />
              )
            })}
          </Group>
        </Box>
      </Box>
    </Box>
  )
}
