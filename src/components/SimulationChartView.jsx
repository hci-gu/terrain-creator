import React, { useState } from 'react'
import { useAtomValue } from 'jotai'
import { unwrap } from 'jotai/utils'
import { timestepsAtom } from '@state'
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
  Stack,
  Card,
  Slider,
  Checkbox,
  SegmentedControl,
} from '@mantine/core'
import { useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { startAndEndManagementPlan } from '@/utils/managementPlan'

const vizColors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6']

const PopulationChart = ({ data, start, end }) => {
  const [visibleFields, setVisibleFields] = useState({})
  const fields = Object.keys(data[0]?.data || {})

  useEffect(() => {
    if (data && data.length > 0) {
      const fields = Object.keys(data[0]?.data || {})
      const initialVisibility = fields.reduce((acc, field) => {
        acc[field] = true
        return acc
      }, {})
      setVisibleFields(initialVisibility)
    }
  }, [data])

  // Calculate total biomass and species breakdown from the last timestep
  const lastTimestep = data[data.length - 1]
  const totalBiomass = lastTimestep
    ? Object.values(lastTimestep.data).reduce((sum, value) => sum + value, 0)
    : 0
  const speciesBiomass = lastTimestep?.data || {}

  return (
    <div style={{ position: 'relative', width: '100%', height: '50%' }}>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          Total Biomass: {(totalBiomass / 1000).toFixed(0)} T
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div>Cod: {(speciesBiomass.cod / 1000).toFixed(0)} T</div>
          <div>Herring: {(speciesBiomass.herring / 1000).toFixed(0)} T</div>
          <div>Sprat: {(speciesBiomass.sprat / 1000).toFixed(0)} T</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.map((item) => ({
            index: item.index,
            ...item.data,
          }))}
        >
          <XAxis
            domain={[0, 365 * 3]}
            type="number"
            dataKey="index"
            tick={{ fill: '#666', fontSize: 12 }}
            tickFormatter={(val) => {
              const date = new Date(start)
              date.setDate(date.getDate() + val - 1)
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            }}
            stroke="#666"
          />
          <YAxis
            tick={{ fill: '#666' }}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)} T`}
            stroke="#666"
          />
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <Legend
            wrapperStyle={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
            formatter={(value, entry) => (
              <Checkbox
                label={value}
                checked={visibleFields[value]}
                onChange={(event) => {
                  const newCheckedState = event.currentTarget.checked
                  setVisibleFields((prev) => ({
                    ...prev,
                    [value]: newCheckedState,
                  }))
                }}
                color={entry.color}
                size="sm"
                styles={{
                  label: { paddingLeft: '0.5em' },
                }}
              />
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

const PRICE_TABLE = {
  cod: 25,
  herring: 2,
  sprat: 1,
}

const RevenueChart = ({ data, start, end }) => {
  const species = ['cod', 'herring', 'sprat']

  // Calculate daily revenue per timestep
  const revenueData = []
  let totalRevenue = 0
  const speciesRevenue = {
    cod: 0,
    herring: 0,
    sprat: 0,
  }

  for (const timestep of data) {
    const point = { index: timestep.index }
    let totalDailyRevenue = 0

    for (const sp of species) {
      const caught = timestep.data?.[`${sp}_fishing`] || 0
      const dailyRevenue = caught * PRICE_TABLE[sp]
      point[sp] = dailyRevenue
      totalDailyRevenue += dailyRevenue
      speciesRevenue[sp] += dailyRevenue
    }
    point.total = totalDailyRevenue
    totalRevenue += totalDailyRevenue
    revenueData.push(point)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '50%' }}>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          Total Revenue: {(totalRevenue / 1000000).toFixed(2)}M
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div>Cod: {(speciesRevenue.cod / 1000000).toFixed(2)}M</div>
          <div>Herring: {(speciesRevenue.herring / 1000000).toFixed(2)}M</div>
          <div>Sprat: {(speciesRevenue.sprat / 1000000).toFixed(2)}M</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={revenueData}>
          <XAxis
            domain={[0, 365 * 3]}
            type="number"
            dataKey="index"
            tick={{ fill: '#666', fontSize: 12 }}
            tickFormatter={(val) => {
              const date = new Date(start)
              date.setDate(date.getDate() + val - 1)
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            }}
            stroke="#666"
          />
          <YAxis
            tick={{ fill: '#666' }}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)} K`}
            stroke="#666"
          />
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <Legend />
          {[...species, 'total'].map((sp, i) => (
            <Line
              key={sp}
              type="monotone"
              dataKey={sp}
              stroke={vizColors[i]}
              strokeWidth={2}
              animationDuration={1000}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const PopulationAndBiodiversityChart = ({ data, start, end }) => {
  const [chartType, setChartType] = useState('population')

  return (
    <>
      <Flex justify="center" p="md">
        <SegmentedControl
          value={chartType}
          onChange={setChartType}
          data={[
            { label: 'Population', value: 'population' },
            { label: 'Biodiversity', value: 'biodiversity' },
          ]}
        />
      </Flex>
      {chartType === 'population' ? (
        <PopulationChart data={data} start={start} end={end} />
      ) : (
        <BiodiversityChart data={data} start={start} end={end} />
      )}
    </>
  )
}

const BiodiversityChart = ({ data, start, end }) => {
  const shannonData = data.map((timestep) => {
    const speciesData = timestep.data
    const species = Object.keys(speciesData)
    const totalBiomass = species.reduce((sum, sp) => sum + speciesData[sp], 0)

    if (totalBiomass === 0) {
      return { index: timestep.index, shannonIndex: 0 }
    }

    let shannonIndex = 0
    for (const sp of species) {
      const proportion = speciesData[sp] / totalBiomass
      if (proportion > 0) {
        shannonIndex -= proportion * Math.log(proportion)
      }
    }

    return { index: timestep.index, shannonIndex }
  })

  return (
    <ResponsiveContainer width="100%" height="50%">
      <LineChart data={shannonData}>
        <XAxis
          domain={[0, 365 * 3]}
          type="number"
          dataKey="index"
          tick={{ fill: '#666', fontSize: 12 }}
          tickFormatter={(val) => {
            const date = new Date(start)
            date.setDate(date.getDate() + val - 1)
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          }}
          stroke="#666"
        />
        <YAxis tick={{ fill: '#666' }} domain={[0, 'auto']} stroke="#666" />
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <Legend />
        <Line
          key="shannonIndex"
          type="monotone"
          dataKey="shannonIndex"
          name="Shannon Index"
          stroke={vizColors[4]}
          strokeWidth={2}
          animationDuration={1000}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export const SimulationChartView = ({ simulationId, managementPlan }) => {
  const [timesteps, setTimeSteps] = useState([])
  const initialTimesteps = useAtomValue(unwrap(timestepsAtom(simulationId)))

  useEffect(() => {
    setTimeSteps(initialTimesteps)
  }, [initialTimesteps])

  useEffect(() => {
    pocketbase.subscribe(
      'timesteps',
      '*',
      (e) => {
        if (e.action == 'create') {
          setTimeSteps((prev) => [...prev, e.record])
        }
      },
      true
    )

    return () => {
      pocketbase.unsubscribe('timesteps')
    }
  }, [simulationId])

  if (!timesteps || !timesteps.length) return <LoadingSpinner />

  // Sort timesteps by index
  const data = [...timesteps].sort((a, b) => a.index - b.index)

  const { start, end } = startAndEndManagementPlan(managementPlan)

  return (
    <>
      <PopulationAndBiodiversityChart
        data={data.map((d) => ({
          index: d.index,
          data: {
            cod: d.data.cod,
            herring: d.data.herring,
            sprat: d.data.sprat,
          },
        }))}
        start={start}
        end={end}
      />
      <RevenueChart data={data} start={start} end={end} />
    </>
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
