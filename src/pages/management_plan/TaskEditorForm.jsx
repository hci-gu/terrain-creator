import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Group,
  Text,
  Image,
  Grid,
  Box,
  Title,
  Switch,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { subDays, addDays } from 'date-fns'
import LandcoverSwatches from './LandcoverSwatches'
import { getTileByIdAtom } from '@state'
import { useAtomValue } from 'jotai'
import TileLandcoverDrawingEditor from '@components/TileLandcoverDrawingEditor'

const TaskEditorForm = ({ task, tasks, onAction }) => {
  const { id_tile } = useParams()
  const [formData, setFormData] = useState({ ...task })
  const [opened, setOpened] = useState(true)
  const tile = useAtomValue(getTileByIdAtom(id_tile))
  const [mapTileImage, setMapTileImage] = useState(false)
  const [tileViewOpened, setTileViewOpened] = useState(false)

  useEffect(() => {
    setFormData({ ...task })
    setOpened(true)
    setTileViewOpened(false)
  }, [task, tasks])

  const currentTaskIndex = useMemo(() => {
    return tasks.findIndex((t) => t.id === task.id)
  }, [task, tasks])

  const previousTask = useMemo(() => {
    if (currentTaskIndex > 0) {
      return tasks[currentTaskIndex - 1]
    }
    return null
  }, [currentTaskIndex, tasks])

  const nextTask = useMemo(() => {
    if (currentTaskIndex !== -1 && currentTaskIndex < tasks.length - 1) {
      return tasks[currentTaskIndex + 1]
    }
    return null
  }, [currentTaskIndex, tasks])

  const handleFieldChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleSave = () => {
    const updatedTaskData = {
      id: formData.id,
      task: formData,
    }
    onAction('updateTask', updatedTaskData)
    setOpened(false)
  }

  const handleCancel = () => {
    onAction(null)
    setFormData({})
    setOpened(false)
  }

  const handleDelete = () => {
    onAction('deleteTask', { id: formData.id })
    setOpened(false)
  }

  const handleClose = () => {
    handleCancel()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        onKeyDown={handleKeyDown}
        title={<Title order={3}>Edit '{formData.name}'</Title>}
        size="lg"
        padding="xl"
      >
        <Stack gap="md">
          {/* Name */}
          <Grid>
            <Grid.Col span={4}>
              <Text>Name</Text>
            </Grid.Col>
            <Grid.Col span={8}>
              <TextInput
                name="name"
                value={formData.name || ''}
                onChange={(e) =>
                  handleFieldChange(e.target.name, e.target.value)
                }
              />
            </Grid.Col>
          </Grid>
          {/* Start Date */}
          <Grid>
            <Grid.Col span={4}>
              <Text>Start Date</Text>
            </Grid.Col>
            <Grid.Col span={8}>
              <DatePickerInput
                value={formData.start}
                onChange={(date) => handleFieldChange('start', date)}
                minDate={previousTask ? previousTask.end : undefined}
                maxDate={formData.end ? subDays(formData.end, 1) : undefined}
                leftSection={<IconCalendar size={16} />}
                valueFormat="MMMM D, YYYY"
                placeholder="Pick a date"
                clearable
              />
            </Grid.Col>
          </Grid>
          {/* End Date */}
          <Grid>
            <Grid.Col span={4}>
              <Text>End Date</Text>
            </Grid.Col>
            <Grid.Col span={8}>
              <DatePickerInput
                value={formData.end}
                onChange={(date) => handleFieldChange('end', date)}
                minDate={
                  formData.start ? addDays(formData.start, 1) : undefined
                }
                maxDate={nextTask ? nextTask.start : undefined}
                leftSection={<IconCalendar size={16} />}
                valueFormat="MMMM D, YYYY"
                placeholder="Pick a date"
                clearable
              />
            </Grid.Col>
          </Grid>
          {/* Map Tile */}
          {task.type === 'landcoverEdit' && (
            <Grid>
              <Grid.Col span={4}>
                <Text>Map Tile</Text>
              </Grid.Col>
              <Grid.Col span={8}>
                <Switch
                  label={mapTileImage ? 'Satellite' : 'Landcover'}
                  checked={mapTileImage}
                  onChange={(event) =>
                    setMapTileImage(event.currentTarget.checked)
                  }
                  mb="xs"
                />
                <Box
                  pos="relative"
                  onClick={() => setTileViewOpened(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <Image
                    src={mapTileImage ? tile.satellite : tile.landcover?.url}
                    alt="Map Tile"
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  {formData.landcoverEdit && (
                    <Image
                      src={formData.landcoverEdit}
                      alt="Landcover Edit"
                      pos="absolute"
                      top={0}
                      left={0}
                    />
                  )}
                  {previousTask && previousTask.landcoverEdit && (
                    <Image
                      src={previousTask.landcoverEdit}
                      alt="Previous Landcover Edit"
                      pos="absolute"
                      top={0}
                      left={0}
                    />
                  )}
                </Box>
              </Grid.Col>
            </Grid>
          )}
          {task.type === 'fishingAmountEdit' && (
            <Grid>
              <Grid.Col span={4}>
                <Text>Fishing Amount</Text>
              </Grid.Col>
            </Grid>
          )}
          {/* Previous Task */}
          <Grid>
            <Grid.Col span={6}>
              <Text>Previous Task</Text>
              {previousTask ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    onAction('changeEditingTask', previousTask)
                  }}
                >
                  {previousTask.name}
                </Button>
              ) : (
                <Box
                  w="100%"
                  h={36}
                  px="sm"
                  py="xs"
                  style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: 'var(--mantine-radius-sm)',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                  }}
                >
                  <Text size="sm" c="dimmed">
                    No previous task
                  </Text>
                </Box>
              )}
            </Grid.Col>
            {/* Next Task */}
            <Grid.Col span={6}>
              <Text>Next Task</Text>
              {nextTask ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    onAction('changeEditingTask', nextTask)
                  }}
                >
                  {nextTask.name}
                </Button>
              ) : (
                <Button
                  variant="filled"
                  fullWidth
                  onClick={() => {
                    onAction('createTask', formData)
                  }}
                >
                  Create New Task
                </Button>
              )}
            </Grid.Col>
          </Grid>
        </Stack>

        <Group justify="flex-end" mt="xl">
          <Button variant="filled" color="red" onClick={handleDelete} mr="auto">
            Delete
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </Group>
      </Modal>

      <Modal
        opened={tileViewOpened}
        onClose={() => setTileViewOpened(false)}
        title={<Title order={3}>Edit Landcover for '{formData.name}'</Title>}
        size="xl"
        padding="xl"
      >
        <TileLandcoverDrawingEditor tile_id={id_tile} />
      </Modal>
    </>
  )
}

export default TaskEditorForm
