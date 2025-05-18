import { parse, addDays } from 'date-fns'

const startDate = parse('2025-04-01', 'yyyy-MM-dd', new Date())
const endDate = addDays(parse('2025-04-30', 'yyyy-MM-dd', new Date()), 1)

export const config = {
  start: startDate,
  end: endDate,
  lengthUnit: 'day',
  scales: [
    { unit: 'month', step: 1, format: 'MMMM yyy' },
    { unit: 'day', step: 1, format: 'd' },
  ],
  cellWidth: 50,
  columns: [
    { id: 'text', header: 'Name', flexgrow: 1 },
    {
      id: 'start',
      header: 'Start',
      flexgrow: 1,
      align: 'center',
      sort: true,
    },
    {
      id: 'end',
      header: 'End',
      flexgrow: 1,
      align: 'center',
      sort: true,
    },
    {
      id: 'duration',
      header: 'Time span',
      flexgrow: 1,
      align: 'center',
      sort: true,
    },
    {
      id: 'action',
      header: '',
      width: 50,
      align: 'center',
    },
  ],
  taskTypes: [
    { id: 'task', label: 'Task' },
    { id: 'landcoverEdit', label: 'Landcover Edit' },
    { id: 'fishingPolicyEdit', label: 'Fishing Policy Edit' },
  ],
}
