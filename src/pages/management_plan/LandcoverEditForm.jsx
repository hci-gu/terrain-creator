import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';
import { subDays, addDays } from 'date-fns';
import LandcoverSwatches from './LandcoverSwatches';
import { getTileByIdAtom } from '@state';
import { useAtomValue } from 'jotai';
import TileLandcoverDrawingEditor from '@components/TileLandcoverDrawingEditor';

const LandcoverEditForm = ({ task, tasks, onAction }) => {
  const { id_tile, id_managementPlan } = useParams()
  const [formData, setFormData] = useState({ ...task });
  const [opened, setOpened] = useState(true);
  const tile = useAtomValue(getTileByIdAtom(id_tile))
  const [mapTileImage, setMapTileImage] = useState(false);
  const [tileViewOpened, setTileViewOpened] = useState(false);

  useEffect(() => {
    console.log(task);
    if (task.mapParent !== null) {
      const mapParent = tasks.byId(task.mapParent);
      setFormData({
        ...task,
        mapTile: mapParent.mapTile,
      });
    } else {
      setFormData({
        ...task,
      });
    }
    setOpened(true);
    setTileViewOpened(false);
  }, [task, tasks]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (fieldName, date) => {
    setFormData((prev) => ({ ...prev, [fieldName]: date }));
  };

  const handleSave = () => {
    const updatedTaskData = {
      id: formData.id,
      task: formData,
    };
    onAction("update-task", updatedTaskData);
    setOpened(false);
  };

  const handleCancel = () => {
    onAction(null);
    setFormData({});
    setOpened(false);
  };

  const handleClose = () => {
    handleCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

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
                value={formData.start}
                onChange={(date) => handleDateChange('start', date)}
                minDate={
                  formData.mapParent
                    ? tasks.byId(formData.mapParent)?.end
                    : undefined
                }
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
                onChange={(date) => handleDateChange('end', date)}
                minDate={formData.start ? addDays(formData.start, 1) : undefined}
                leftSection={<IconCalendar size={16} />}
                valueFormat="MMMM D, YYYY"
                placeholder="Pick a date"
                clearable
              />
            </Grid.Col>
          </Grid>
          {/* Map Tile */}
          <Grid>
            <Grid.Col span={4}>
              <Text>Map Tile</Text>
            </Grid.Col>
            <Grid.Col span={8}>
                <Switch
                  label={mapTileImage ? 'Satellite' : 'Landcover'}
                  checked={mapTileImage}
                  onChange={(event) => setMapTileImage(event.currentTarget.checked)}
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
                  <Image
                    src={formData.mapLandcover}
                    alt="Map Landcover"
                    pos="absolute"
                    top={0}
                    left={0}
                  />
                  {formData.mapParent &&
                    tasks.byId(formData.mapParent)?.mapLandcover && (
                      <Image
                        src={tasks.byId(formData.mapParent).mapLandcover}
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
                selectedType={formData.mapLandcoverType}
                onSelect={(type) =>
                  setFormData((prev) => ({ ...prev, mapLandcoverType: type }))
                }
              />
            </Grid.Col>
          </Grid>
          {/* Map Parent */}
          <Grid>
            <Grid.Col span={6}>
              <Text>Map Parent</Text>
              {formData.mapParent ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    const parentTask = tasks.byId(formData.mapParent)
                    if (parentTask) {
                      setFormData({ ...parentTask })
                    }
                  }}
                >
                  {tasks.byId(formData.mapParent)?.text || formData.mapParent}
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
                    No parent task
                  </Text>
                </Box>
              )}
            </Grid.Col>
            {/* Map Child */}
            <Grid.Col span={6}>
              <Text>Map Child</Text>
              {formData.mapChild ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    const childTask = tasks.byId(formData.mapChild)
                    if (childTask) {
                      setFormData({ ...childTask })
                    }
                  }}
                >
                  {tasks.byId(formData.mapChild)?.text || formData.mapChild}
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
                    No child task
                  </Text>
                </Box>
              )}
            </Grid.Col>
          </Grid>
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
        <TileLandcoverDrawingEditor tile_id={id_tile} />
      </Modal>
    </>
  )
};

export default LandcoverEditForm; 