import React, { useState, useEffect } from 'react'
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
  Card,
  Space,
  Slider,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { subDays, addDays } from 'date-fns'
import LandcoverSwatches from './LandcoverSwatches'
import { getTileByIdAtom } from '@state'
import { useAtomValue } from 'jotai'
import TileLandcoverDrawingEditor from '@components/TileLandcoverDrawingEditor'

const GanttCustomEditor = ({ taskToEdit, tasks, onAction }) => {
  const { id_tile, id_managementPlan } = useParams()
  const [formData, setFormData] = useState({ ...taskToEdit })
  const [opened, setOpened] = useState(true)
  const tile = useAtomValue(getTileByIdAtom(id_tile))
  const [tileImage, setMapTileImage] = useState(tile.landcover.url)
  const [tileViewOpened, setTileViewOpened] = useState(false)

  useEffect(() => {
    console.log('taskToEdit:', taskToEdit)
    let initialFormData = { ...taskToEdit }
    if (
      taskToEdit.type === 'fishingPolicyEdit' &&
      !initialFormData.fishingAmounts
    ) {
      initialFormData.fishingAmounts = {
        herring: 0.26, // Default values, consider making these configurable
        spat: 0.26,
        cod: 0.5,
      }
    }

    if (taskToEdit.taskPrev !== null) {
      const taskPrev = tasks.byId(taskToEdit.taskPrev)
      setFormData({
        ...initialFormData,
        // mapTile: taskPrev.mapTile, // Consider if this is needed for fishingPolicyEdit
      })
    } else {
      setFormData({
        ...initialFormData,
      })
    }
    setOpened(true)
    setTileViewOpened(false)
  }, [taskToEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (fieldName, date) => {
    setFormData((prev) => ({ ...prev, [fieldName]: date }))
  }

  const handleFishingAmountsChange = (species, value) => {
    setFormData((prev) => ({
      ...prev,
      fishingAmounts: {
        ...prev.fishingAmounts,
        [species]: value,
      },
    }))
  }

  const handleSave = () => {
    const updatedTaskData = {
      id: formData.id,
      task: formData,
    }
    onAction('update-task', updatedTaskData)
    setOpened(false)
  }

  const handleAddTask = () => {
    const newTaskData = {
      target: formData.id,
      task: {
        ...formData,
        taskPrev: formData.id,
        taskNext: null,
        text: `Copy of ${formData.text}`,
        // Ensure type is copied or handled appropriately
        type: formData.type,
      },
      mode: 'after',
    }
    onAction('add-task', {
      task: {
        ...formData,
        id: taskToEdit.id + 1,
        text: `Copy of ${formData.text}`,
        taskPrev: taskToEdit.id,
        taskNext: null,
        start: taskToEdit.end,
        end: addDays(new Date(taskToEdit.end), 7),
        // text: `Copy of ${formData.text}`,
        // Ensure type is copied or handled appropriately
        // type: formData.type,
      },
    })
    setOpened(false)
  }

  const handleCancel = () => {
    onAction(null)
    // Resetting formData to an empty object might not be ideal if the modal can be reopened.
    // Consider resetting to initial taskToEdit or a sensible default.
    // For now, keeping the existing behavior.
    setFormData({})
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
        title={<Title order={3}>Edit '{formData.text}'</Title>}
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
                name="text"
                value={formData.text || ''}
                onChange={handleChange}
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
                value={formData.start ? new Date(formData.start) : null}
                onChange={(date) => handleDateChange('start', date)}
                minDate={
                  formData.taskPrev && tasks.byId(formData.taskPrev)?.end
                    ? new Date(tasks.byId(formData.taskPrev).end)
                    : undefined
                }
                maxDate={
                  formData.end ? subDays(new Date(formData.end), 1) : undefined
                }
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
                value={formData.end ? new Date(formData.end) : null}
                onChange={(date) => handleDateChange('end', date)}
                minDate={
                  formData.start
                    ? addDays(new Date(formData.start), 1)
                    : undefined
                }
                leftSection={<IconCalendar size={16} />}
                valueFormat="MMMM D, YYYY"
                placeholder="Pick a date"
                clearable
              />
            </Grid.Col>
          </Grid>

          {/* Conditional Rendering based on type */}
          {formData.type === 'landcoverEdit' && (
            <>
              {/* Map Tile */}
              <Grid>
                <Grid.Col span={4}>
                  <Text>Map Tile</Text>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Switch
                    label={
                      tileImage === tile.satellite ? 'Satellite' : 'Landcover'
                    }
                    checked={tileImage === tile.satellite}
                    onChange={(event) =>
                      setMapTileImage(
                        event.currentTarget.checked
                          ? tile.satellite
                          : tile.landcover.url
                      )
                    }
                    mb="xs"
                  />
                  <Box
                    pos="relative"
                    onClick={() => setTileViewOpened(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Image
                      src={tileImage}
                      alt="Map Tile"
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <Image
                      src={formData.landcoverEditUrl}
                      alt="Map Landcover"
                      pos="absolute"
                      top={0}
                      left={0}
                    />
                    {formData.taskPrev &&
                      tasks.byId(formData.taskPrev)?.landcoverEditUrl && (
                        <Image
                          src={tasks.byId(formData.taskPrev).landcoverEditUrl}
                          alt="Parent Map Landcover"
                          pos="absolute"
                          top={0}
                          left={0}
                        />
                      )}
                  </Box>
                </Grid.Col>
              </Grid>
              {/* Map Landcover Type */}
              <Grid>
                <Grid.Col span={4}>
                  <Text>Map Landcover Type</Text>
                </Grid.Col>
                <Grid.Col span={8}>
                  <LandcoverSwatches
                    selectedType={formData.landcoverEditUrlType}
                    onSelect={(type) =>
                      setFormData((prev) => ({
                        ...prev,
                        landcoverEditUrlType: type,
                      }))
                    }
                  />
                </Grid.Col>
              </Grid>
            </>
          )}

          {formData.type === 'fishingPolicyEdit' && formData.fishingAmounts && (
            <Grid>
              <Grid.Col span={12}>
                <Card withBorder p="md">
                  <Text fw={500} mb="sm">
                    Fishing Amounts
                  </Text>
                  {Object.entries(formData.fishingAmounts).map(
                    ([species, amount]) => (
                      <div key={`fishing_${species}`}>
                        <Text>
                          {species.charAt(0).toUpperCase() + species.slice(1)}
                        </Text>
                        <Space h="xs" />
                        <Slider
                          value={amount}
                          onChange={(value) =>
                            handleFishingAmountsChange(species, value)
                          }
                          min={0}
                          max={10} // Assuming max 10% like in SimulationChartView
                          step={0.01}
                          label={(value) => `${value.toFixed(2)}%`} // Ensure label format
                          marks={[
                            // Example marks, adjust as needed
                            { value: 0, label: '0%' },
                            { value: 2.5, label: '2.5%' },
                            { value: 5, label: '5%' },
                            { value: 7.5, label: '7.5%' },
                            { value: 10, label: '10%' },
                          ]}
                        />
                        <Space h="md" />
                      </div>
                    )
                  )}
                </Card>
              </Grid.Col>
            </Grid>
          )}

          {/* Previous and Next Tasks */}
          <Group grow>
            {formData.taskPrev && (
              <Box>
                <Text>Previous Task</Text>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    const parentTask = tasks.byId(formData.taskPrev)
                    if (parentTask) {
                      setFormData({ ...parentTask })
                    }
                  }}
                >
                  {tasks.byId(formData.taskPrev)?.text || formData.taskPrev}
                </Button>
              </Box>
            )}
            <Box>
              <Text>Next Task</Text>
              {formData.taskNext ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    const childTask = tasks.byId(formData.taskNext)
                    if (childTask) {
                      setFormData({ ...childTask })
                    }
                  }}
                >
                  {tasks.byId(formData.taskNext)?.text || formData.taskNext}
                </Button>
              ) : (
                <Button variant="outline" fullWidth onClick={handleAddTask}>
                  Create new Task
                </Button>
              )}
            </Box>
          </Group>
        </Stack>

        <Group justify="flex-end" mt="xl">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </Group>
      </Modal>

      <Modal
        opened={tileViewOpened}
        onClose={() => setTileViewOpened(false)}
        title={<Title order={3}>Edit Landcover for '{formData.text}'</Title>}
        size="xl"
        padding="xl"
      >
        {/* Ensure TileLandcoverDrawingEditor is only relevant for landcoverEdit type */}
        {formData.type === 'landcoverEdit' && (
          <TileLandcoverDrawingEditor tile_id={id_tile} />
        )}
      </Modal>
    </>
  )
}

export default GanttCustomEditor
