import React, { useLayoutEffect, useEffect, useRef } from 'react'
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
}) => (
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
        {task.type === 'fishingPolicy' && task.data && (
          <FishingPolicyView fishingPolicy={task.data} />
        )}
        {tile.landcover?.url &&
          task.type === 'landcover' &&
          widthPercentage > 1 && (
            <Box mih="0" style={{ display: 'flex' }}>
              <Image
                src={tile.landcover.url}
                alt={task.name}
                radius="sm"
                h="60px"
                fit="contain"
              />
            </Box>
          )}
      </Stack>
    </Paper>
  </Tooltip>
)

export const Timeline = ({ tasks, tile, onTaskClick }) => {
  const containerRef = useRef(null)
  const [timelineWidth, setTimelineWidth] = useAtom(timelineWidthAtom)
  const zoomAnchor = useRef(null)

  // 1) Initialize width on mount
  useLayoutEffect(() => {
    const el = containerRef.current
    if (el) {
      setTimelineWidth(el.clientWidth)
    }
  }, [setTimelineWidth])

  // 2) Wheel → scroll / shift+wheel → zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      if (e.shiftKey) {
        e.preventDefault()
        const mouseX = e.clientX - el.getBoundingClientRect().left
        const beforeW = timelineWidth || el.clientWidth
        const scrollLeft = el.scrollLeft

        zoomAnchor.current = {
          ratio: (scrollLeft + mouseX) / beforeW,
          mouseX,
          beforeW,
        }

        setTimelineWidth((prev) => {
          const change = e.deltaY * ZOOM_SPEED_FACTOR
          return Math.max(el.clientWidth, prev - change)
        })
      } else if (e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft -= e.deltaY
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () =>
      el.removeEventListener('wheel', handleWheel, { passive: false })
  }, [timelineWidth, setTimelineWidth])

  // 3) After zoom, re-anchor scroll
  useEffect(() => {
    const el = containerRef.current
    const anchor = zoomAnchor.current
    if (el && anchor) {
      const { ratio, mouseX, beforeW } = anchor
      const newW = timelineWidth
      if (newW !== beforeW) {
        let newScroll = ratio * newW - mouseX
        const maxScroll = newW - el.clientWidth
        el.scrollLeft = Math.max(0, Math.min(newScroll, maxScroll))
      }
    }
    zoomAnchor.current = null
  }, [timelineWidth])

  // 4) Compute past-5-year window
  const now = new Date()
  const startDate = new Date(now)
  startDate.setFullYear(now.getFullYear())
  startDate.setMonth(0, 1) // January 1st
  // zero-out time so tasks align by date
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(startDate)
  endDate.setFullYear(now.getFullYear() + 3)
  endDate.setHours(23, 59, 59, 999)
  const totalDuration = endDate.getTime() - startDate.getTime()

  // 5) Year markers at each whole year
  const yearMarkers = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(startDate)
    m.setFullYear(startDate.getFullYear() + i)
    return m
  })

  return (
    <Box
      ref={containerRef}
      flex="auto"
      style={{ overflowX: 'scroll', overflowY: 'auto', userSelect: 'none' }}
    >
      <Box w={`${timelineWidth}px`} h="100%" pos="relative">
        {/* Year labels */}
        <Group h="30" gap="0" pos="relative">
          {yearMarkers.map((d, i) => {
            const pct =
              ((d.getTime() - startDate.getTime()) / totalDuration) * 100
            return (
              <Text
                key={i}
                fz="sm"
                fw={600}
                c="dimmed"
                pos="absolute"
                left={`${pct}%`}
                pl="4px"
              >
                {format(d, 'yyyy')}
              </Text>
            )
          })}
        </Group>

        {/* Grid + tasks */}
        <Box
          h="calc(100% - 30px)"
          pos="relative"
          sx={(theme) => ({
            backgroundColor:
              theme.colorScheme === 'dark'
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
          })}
        >
          {yearMarkers.map((d, i) => {
            const pct =
              ((d.getTime() - startDate.getTime()) / totalDuration) * 100
            return (
              <Divider
                key={i}
                orientation="vertical"
                size="xs"
                pos="absolute"
                left={`${pct}%`}
                top="0"
                bottom="0"
                style={{ zIndex: 1 }}
              />
            )
          })}

          <Group h="100%" gap="lg" wrap="nowrap" pos="relative">
            {tasks.map((task) => {
              const ts = new Date(task.start)
              const te = new Date(task.end)

              const clampedStart = new Date(Math.max(ts, startDate))
              const clampedEnd = new Date(Math.min(te, endDate))
              if (clampedStart > clampedEnd) return null

              const dur = clampedEnd.getTime() - clampedStart.getTime()
              const leftPct =
                ((clampedStart.getTime() - startDate.getTime()) /
                  totalDuration) *
                100
              const widthPct = (dur / totalDuration) * 100
              if (widthPct <= 0) return null

              return (
                <TimelineTaskItem
                  key={task.id}
                  task={task}
                  tile={tile}
                  leftPercentage={leftPct}
                  widthPercentage={widthPct}
                  clampedTaskStart={clampedStart}
                  clampedTaskEnd={clampedEnd}
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
