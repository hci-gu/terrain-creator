import { Gantt, ContextMenu} from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import { data } from "./data";
import { config } from "./config";
import { useRef, useEffect, useState } from "react";
import LandcoverEditForm from "./LandcoverEditForm";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Container, Flex, useMantineColorScheme, Title, Group, Stack} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { getManagementPlanAtom } from "@state";
import { useAtomValue } from "jotai";

export const ManagementPlanView = ({ id_tile }) => {
  const { id_managementPlan } = useParams()
  const apiRef = useRef(null)
  const [taskToEdit, setTaskToEdit] = useState(null)
  const [tasks, setTasks] = useState(null)
  const managementPlan = useAtomValue(getManagementPlanAtom(id_managementPlan))
  const navigate = useNavigate()
  const { colorScheme } = useMantineColorScheme()
  const ganttThemeClass =
    colorScheme === 'dark' ? 'wx-willow-dark-theme' : 'wx-willow-theme'
  useEffect(() => {
    if (colorScheme === 'dark') {
      Gantt.className = 'wx-willow-dark-theme'
    } else {
      Gantt.className = 'wx-willow-theme'
    }
  }, [colorScheme])

  useEffect(() => {
    if (apiRef.current) {
      const api = apiRef.current

      const interceptorId = api.intercept('show-editor', (data) => {
        if (!tasks) return true

        const task = tasks.byId(data.id)
        if (task && task.type === 'landcoverEdit') {
          setTaskToEdit(task)
          return false
        }
        return true
      })

      return () => {
        api.detach('show-editor', interceptorId)
      }
    }
  }, [tasks])

  const handleFormAction = (action = null, data = null) => {
    console.log('Action received from custom editor:', action, data)
    if (!action) {
      setTaskToEdit(null)
      return
    }
    switch (action) {
      case 'update-task':
        if (apiRef.current) {
          if (!data) {
            console.warn('No data provided for update-task action')
            return
          }

          // Check if the updated task has a child and shift it if needed
          const updatedTask = data.task
          if (updatedTask.mapChild && tasks) {
            const childTask = tasks.byId(updatedTask.mapChild)
            if (childTask && childTask.start < updatedTask.end) {
              // Calculate new end date based on child's duration
              const newEndDate = new Date(updatedTask.end)
              newEndDate.setDate(newEndDate.getDate() + childTask.duration)

              // Update child task
              const childUpdate = {
                id: childTask.id,
                task: {
                  ...childTask,
                  start: updatedTask.end,
                  end: newEndDate,
                },
              }
              apiRef.current.exec(action, childUpdate)
            }
          }

          // Update the original task
          apiRef.current.exec(action, data)
          setTaskToEdit(null)
        }
        break
      default:
        console.warn('Unhandled action from custom editor:', action)
        break
    }
  }

  return (
    <Container fluid style={{ height: '100vh', padding: '1rem' }}>
      <link
        rel="stylesheet"
        href="https://cdn.svar.dev/fonts/wxi/wx-icons.css"
      />
      <Flex direction="column" h="100%">
        <Stack align="flex-start">
          <Title order={2}>{managementPlan.name}</Title>
          <Button
            variant="filled"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(`/dashboard/tile/${id_tile}`)}
            mb="md"
        >
            Back to Tile
          </Button>
        </Stack>
        <div
          className={ganttThemeClass}
          style={{
            flexGrow: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* <ContextMenu api={apiRef.current} > */}
          <Gantt
            className={ganttThemeClass}
            init={(api) => {
              apiRef.current = api
              setTasks(api.getState().tasks)
              api.on('update-task', () => setTasks(api.getState().tasks))
              api.on('add-task', () => setTasks(api.getState().tasks))
              api.on('delete-task', () => setTasks(api.getState().tasks))
            }}
            start={config.start}
            end={config.end}
            lengthUnit={config.lengthUnit}
            scales={config.scales}
            zoom={true}
            cellWidth={config.cellWidth}
            columns={config.columns}
            taskTypes={config.taskTypes}
            taskTemplate={config.MyTaskContent}
            tasks={data.tasks}
            links={data.links}
          />
        </div>
        {/* </ContextMenu> */}
      </Flex>
      {taskToEdit && (
        <LandcoverEditForm
          task={taskToEdit}
          tasks={tasks}
          onAction={handleFormAction}
        />
      )}
    </Container>
  )
}

export default ManagementPlanView
