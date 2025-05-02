import { Gantt } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import { data } from "./data";
import { config } from "./config";
import { useRef, useEffect, useState } from "react";
import TerrainModificationEditor from "./TerrainModificationEditor";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Container, Flex } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

export const GanttView = () => {
  const apiRef = useRef(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [tasks, setTasks] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (apiRef.current) {
      const api = apiRef.current;

      const interceptorId = api.intercept("show-editor", (data) => {
        if (!tasks) return true;

        const task = tasks.byId(data.id);
        if (task && task.type === "terrainModification") {
          setTaskToEdit(task);
          return false;
        }
        return true;
      });

      return () => {
        api.detach("show-editor", interceptorId);
      };
    }
  }, [tasks]);

  const handleFormAction = (action = null, data = null) => {
    console.log("Action received from custom editor:", action, data);
    if (!action) {
      setTaskToEdit(null);
      return;
    }
    switch (action) {
      case "update-task":
        if (apiRef.current) {
          if (!data) {
            console.warn("No data provided for update-task action");
            return;
          }

          // Check if the updated task has a child and shift it if needed
          const updatedTask = data.task;
          if (updatedTask.mapChild && tasks) {
            const childTask = tasks.byId(updatedTask.mapChild);
            if (childTask && childTask.start < updatedTask.end) {
              // Calculate new end date based on child's duration
              const newEndDate = new Date(updatedTask.end);
              newEndDate.setDate(newEndDate.getDate() + childTask.duration);

              // Update child task
              const childUpdate = {
                id: childTask.id,
                task: {
                  ...childTask,
                  start: updatedTask.end,
                  end: newEndDate
                }
              };
              apiRef.current.exec(action, childUpdate);
            }
          }

          // Update the original task
          apiRef.current.exec(action, data);
          setTaskToEdit(null);
        }
        break;
      default:
        console.warn("Unhandled action from custom editor:", action);
        break;
    }
  };

  return (
    <Container fluid style={{ height: '100vh', padding: '1rem' }}>
      <link
        rel="stylesheet"
        href="https://cdn.svar.dev/fonts/wxi/wx-icons.css"
      />
      <Flex direction="column" h="100%">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(`/tile/${id}`)}
          mb="md"
        >
          Back to Tile
        </Button>
        <div style={{ flex: 1 }}>
          <Gantt
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
      </Flex>
      {taskToEdit && (
        <TerrainModificationEditor
          task={taskToEdit}
          tasks={tasks}
          onAction={handleFormAction}
        />
      )}
    </Container>
  )
};

export default GanttView;
