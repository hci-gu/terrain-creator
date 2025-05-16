import React, { useState } from 'react'
import { useAtomValue } from 'jotai'
import { unwrap } from 'jotai/utils'
import { simulationAtom, timestepsAtom } from '../state'
import { formatDate } from '@utils/formatDate'
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
  Box,
  Container,
} from '@mantine/core'
import { useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { SimulationItemList } from './SimulationItemList'

const vizColors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6']

export const SimulationChartView = ({ id_simulation }) => {
  const [timesteps, setTimeSteps] = useState([])
  const [visibleFields, setVisibleFields] = useState({})
  const initialTimesteps = useAtomValue(unwrap(timestepsAtom(id_simulation)))

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
  }, [id_simulation])

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
    <ResponsiveContainer
      width="100%"
      height="100%"
      style={{ overflowX: 'scroll', overflowY: 'hidden' }}
    >
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <XAxis
          dataKey="day"
          tickFormatter={(val) => `${val}`}
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
  )
}

export const SettingsPanel = ({ options, setOptions }) => {
  return (
    <Stack gap="md">
      <Text size="lg" fw={500}>
        Simulation Settings
      </Text>
      <Card withBorder p="md">
        <Text fw={500} mb="sm">
          Max Steps
        </Text>
        <input
          type="number"
          value={options.maxSteps}
          onChange={(e) =>
            setOptions((prev) => ({
              ...prev,
              maxSteps: parseInt(e.target.value) || 0,
            }))
          }
          min="0"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ced4da',
          }}
        />
        <Space h="md" />
      </Card>
      <Card withBorder p="md">
        <Text fw={500} mb="sm">
          Fishing Amounts
        </Text>
        {Object.entries(options.fishingAmounts).map(([species, amount]) => (
          <div key={`fishing_${species}`}>
            <Text>{species.charAt(0).toUpperCase() + species.slice(1)}</Text>
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
              max={10}
              step={0.01}
              label={(value) => `${value}%`}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.5, label: '0.5%' },
                { value: 2, label: '2%' },
                { value: 5, label: '5%' },
                { value: 10, label: '10%' },
              ]}
            />
            <Space h="md" />
          </div>
        ))}
      </Card>
      <Card withBorder p="md">
        <Text fw={500} mb="sm">
          Initial Population
        </Text>
        {Object.entries(options.initialPopulation).map(
          ([species, population]) => (
            <div key={`population_${species}`}>
              <Text>{species.charAt(0).toUpperCase() + species.slice(1)}</Text>
              <Space h="xs" />
              <input
                type="number"
                value={population}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    initialPopulation: {
                      ...prev.initialPopulation,
                      [species]: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                min="0"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                }}
              />
              <Space h="md" />
            </div>
          )
        )}
      </Card>
    </Stack>
  )
}

export default SimulationChartView
