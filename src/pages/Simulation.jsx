import React, { useState } from 'react'
import { useAtomValue } from 'jotai'
import { unwrap } from 'jotai/utils'
import { simulationAtom, timestepsAtom } from '../state'
import { formatDate } from '../utils'
import * as pocketbase from '../pocketbase'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Space,
  Text,
  Flex,
  Button,
  Title,
  Stack,
  Card,
  Slider,
} from '@mantine/core'
import { IconTrashFilled } from '@tabler/icons-react'
import { useEffect } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'

const vizColors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6']

const SimulationLineChart = ({ id }) => {
  const [timesteps, setTimeSteps] = useState([])
  const [visibleFields, setVisibleFields] = useState({})
  const initialTimesteps = useAtomValue(unwrap(timestepsAtom(id)))

  useEffect(() => {
    setTimeSteps(initialTimesteps)
  }, [initialTimesteps])

  useEffect(() => {
    if (timesteps && timesteps.length > 0) {
      const fields = Object.keys(timesteps[0]?.data || {})
      const initialVisibility = fields.reduce((acc, field) => {
        acc[field] = true
        return acc
      }, {})
      setVisibleFields(initialVisibility)
    }
  }, [timesteps])

  useEffect(() => {
    console.log('start subscription')
    pocketbase.subscribe(
      'timesteps',
      '*',
      (e) => {
        console.log('timesteps subscription', e)
        setTimeSteps((prevTimesteps) => {
          return [...prevTimesteps, e.record]
        })
      },
      true
    )

    return () => {
      pocketbase.unsubscribe('timesteps')
    }
  }, [id])

  if (!timesteps || !timesteps.length) return <LoadingSpinner />

  // Sort timesteps by index
  const sortedTimesteps = [...timesteps].sort((a, b) => a.index - b.index)

  // Get all species from the first timestep's data
  const fields = Object.keys(sortedTimesteps[0]?.data || {})

  // Transform timesteps directly into chart data
  const data = sortedTimesteps.map((timestep) => ({
    day: timestep.index + 1,
    ...timestep.data,
  }))

  return (
    <div style={{ width: '100%', height: '100%', padding: '1.5rem' }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={400}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis
            dataKey="day"
            tickFormatter={(val) => `Day ${val}`}
            stroke="#666"
            tick={{ fill: '#666', fontSize: 14, fontWeight: 700 }}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: '#666', fontSize: 14, fontWeight: 700 }}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}`}
          />
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px',
            }}
            formatter={(value, entry) => (
              <Flex align="center" gap="sm">
                <input
                  type="checkbox"
                  checked={visibleFields[value]}
                  onChange={() => {
                    setVisibleFields((prev) => ({
                      ...prev,
                      [value]: !prev[value],
                    }))
                  }}
                  style={{ accentColor: entry.color }}
                />
                <span>{value}</span>
              </Flex>
            )}
          />
          {fields.map((field, i) => (
            <Line
              key={field}
              type="monotone"
              dataKey={field}
              stroke={vizColors[i]}
              strokeWidth={2}
              animationDuration={1000}
              dot={false}
              hide={!visibleFields[field]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const SettingsPanel = ({ options, setOptions }) => {
  return (
    <Stack gap="md">
      <Text size="lg" fw={500}>
        Simulation Settings
      </Text>
      <Card withBorder p="md">
        {Object.entries(options.fishingAmounts).map(([species, amount]) => (
          <div key={species}>
            <Text>
              Fishing Amount -{' '}
              {species.charAt(0).toUpperCase() + species.slice(1)}
            </Text>
            <Space h="xs" />
            <Slider
              value={amount}
              onChange={(value) =>
                setOptions((prev) => ({
                  ...prev,
                  fishingAmounts: {
                    ...prev.fishingAmounts,
                    [species]: value,
                  },
                }))
              }
              min={0}
              max={100}
              label={(value) => `${value}%`}
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' },
              ]}
            />
            <Space h="md" />
          </div>
        ))}
      </Card>
    </Stack>
  )
}

export const Simulations = ({ tile }) => {
  const [selected, setSelected] = useState(tile.simulations?.[0]?.id || null)
  const [showSettings, setShowSettings] = useState(false)
  const [simulationOptions, setSimulationOptions] = useState({
    fishingAmounts: {
      herring: 10,
      spat: 10,
      cod: 10,
    },
  })

  return (
    <Flex style={{ width: '100%', minHeight: '100%' }} direction="column">
      <Flex align="center" justify="space-between" w="100%" mb="md">
        <Title order={2}>Simulations</Title>
        <Button variant="subtle" onClick={() => setShowSettings(!showSettings)}>
          {showSettings ? 'Back to Simulations' : 'Settings'}
        </Button>
      </Flex>
      <div>
        {showSettings ? (
          <SettingsPanel
            options={simulationOptions}
            setOptions={setSimulationOptions}
          />
        ) : (
          <Flex>
            <Stack gap="md" mt="md">
              {tile.simulations?.map((simulation) => (
                <Card
                  key={simulation.id}
                  withBorder
                  shadow="xs"
                  style={
                    simulation.id === selected
                      ? { borderColor: '#339AF0', borderWidth: 2 }
                      : {}
                  }
                  onClick={() => setSelected(simulation.id)}
                >
                  <Flex align="center" justify="space-between">
                    <Flex direction="column">
                      <Text fw={500}>
                        {simulation.created.toLocaleDateString()}
                      </Text>
                      <Text fz="sm" c="dimmed">
                        {simulation.created
                          .toLocaleTimeString()
                          .split(':')
                          .map((part, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: i === 2 ? '0.8em' : 'inherit',
                              }}
                            >
                              {i > 0 ? ':' : ''}
                              {part}
                            </span>
                          ))}
                      </Text>
                    </Flex>
                    <Space w="md" />
                    <Button
                      w={48}
                      pl={12}
                      pr={12}
                      variant="outline"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        pocketbase.deleteSimulation(tile.id, simulation.id)
                        setSelected(null)
                      }}
                    >
                      <IconTrashFilled />
                    </Button>
                  </Flex>
                </Card>
              ))}
              <Button
                onClick={async () => {
                  try {
                    const simulation = await pocketbase.createSimulation(
                      tile,
                      simulationOptions
                    )
                    setSelected(simulation.id)
                  } catch (error) {
                    console.error('Failed to create simulation:', error.message)
                    alert('Failed to create simulation: ' + error.message)
                  }
                }}
              >
                Run new simulation
              </Button>
            </Stack>
            {selected && (
              <div style={{ flex: 1, paddingLeft: '1rem', minWidth: 0 }}>
                <SimulationLineChart id={selected} />
              </div>
            )}
          </Flex>
        )}
      </div>
    </Flex>
  )
}

export default Simulations
