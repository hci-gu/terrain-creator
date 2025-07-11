export const startAndEndManagementPlan = (managementPlan) => {
  const tasks = managementPlan?.tasks || []

  if (tasks.length === 0) {
    return { start: null, end: null }
  }
  const start = new Date(Math.min(...tasks.map((task) => new Date(task.start))))
  const end = new Date(Math.max(...tasks.map((task) => new Date(task.end))))
  return { start, end }
}
