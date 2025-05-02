import React, { useState, useEffect } from 'react';
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
} from '@mantine/core';
import { DatePicker } from './DatePickerComponent';
import { subDays, addDays } from 'date-fns';
import LandcoverSwatches from './LandcoverSwatches';

const TerrainModificationEditor = ({ task, tasks, onAction }) => {
  const [formData, setFormData] = useState({ ...task });
  const [opened, setOpened] = useState(true);

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
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Editing '${formData.text}':`}
      size="lg"
    >
      <Stack gap="md">
        <Grid>
          <Grid.Col span={4}>
            <Text>Name</Text>
          </Grid.Col>
          <Grid.Col span={8}>
            <TextInput
              name="text"
              value={formData.text || ""}
              onChange={handleChange}
            />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={4}>
            <Text>Start Date</Text>
          </Grid.Col>
          <Grid.Col span={8}>
            <DatePicker
              value={formData.start}
              onDateChange={(date) => handleDateChange("start", date)}
              minDate={formData.mapParent ? tasks.byId(formData.mapParent)?.end : undefined}
              maxDate={formData.end ? subDays(formData.end, 1) : undefined}
            />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={4}>
            <Text>End Date</Text>
          </Grid.Col>
          <Grid.Col span={8}>
            <DatePicker
              value={formData.end}
              onDateChange={(date) => handleDateChange("end", date)}
              minDate={formData.start ? addDays(formData.start, 1) : undefined}
            />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={4}>
            <Text>Map Tile</Text>
          </Grid.Col>
          <Grid.Col span={8}>
            <Box pos="relative">
              <Image src={formData.mapTile} alt="Map Tile" />
              <Image
                src={formData.mapLandcover}
                alt="Map Landcover"
                pos="absolute"
                top={0}
                left={0}
              />
              {formData.mapParent && tasks.byId(formData.mapParent)?.mapLandcover && (
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

        <Grid>
          <Grid.Col span={4}>
            <Text>Map Landcover Type</Text>
          </Grid.Col>
          <Grid.Col span={8}>
            <LandcoverSwatches
              selectedType={formData.mapLandcoverType}
              onSelect={(type) => setFormData(prev => ({ ...prev, mapLandcoverType: type }))}
            />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={6}>
            <Text>Map Parent</Text>
            {formData.mapParent ? (
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  const parentTask = tasks.byId(formData.mapParent);
                  if (parentTask) {
                    setFormData({ ...parentTask });
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
                <Text size="sm" c="dimmed">No parent task</Text>
              </Box>
            )}
          </Grid.Col>
          <Grid.Col span={6}>
            <Text>Map Child</Text>
            {formData.mapChild ? (
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  const childTask = tasks.byId(formData.mapChild);
                  if (childTask) {
                    setFormData({ ...childTask });
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
                <Text size="sm" c="dimmed">No child task</Text>
              </Box>
            )}
          </Grid.Col>
        </Grid>
      </Stack>

      <Group justify="flex-end" mt="xl">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </Group>
    </Modal>
  );
};

export default TerrainModificationEditor; 