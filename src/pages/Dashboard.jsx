import React, { useState, Suspense, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Breadcrumbs,
  Anchor,
  Flex,
  Divider,
  Button,
  Text,
  Stack,
  Grid,
  Image,
  Box,
} from '@mantine/core'
import { useAtomValue, useSetAtom, useAtom } from 'jotai'
import { getTileByIdAtom, managementPlansAtom } from '@state'
import { ManagementPlanView } from '@pages/management_plan/ManagementPlanView'
import { SimulationChartView } from '@components/SimulationChartView'
import { ManagementPlanItemList } from '@components/ManagementPlanItemList'
import { SimulationItemList } from '@components/SimulationItemList'
import { ContentCell, ContentLayout } from '@components/DashboardStyles'
import * as pocketbase from '@/pocketbase'

const Dashboard = () => {
  const { id_tile } = useParams()
  const tile = useAtomValue(getTileByIdAtom(id_tile))
  const [managementPlans, setManagementPlans] = useAtom(managementPlansAtom)
  const [selectedPlanId, setSelectedPlanId] = useState(0)
  const [selectedSimulationId, setSelectedSimulationId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [simulationOptions, setSimulationOptions] = useState({
    maxSteps: 1000,
    fishingAmounts: {
      herring: 0.26,
      spat: 0.26,
      cod: 0.5,
    },
    initialPopulation: {
      herring: 760,
      spat: 1525,
      cod: 388,
    },
  })

  useEffect(() => {
    if (tile && tile.simulations && tile.simulations.length > 0) {
      setSelectedSimulationId(tile.simulations[0].id)
    }
  }, [tile])

  const createManagementPlan = (planName) => {
    const newPlan = {
      id: managementPlans.length,
      name: planName
        ? planName
        : `Management Plan ${managementPlans.length + 1}`,
      created: new Date(),
      tile: tile,
    }
    setManagementPlans([...managementPlans, newPlan])
    return newPlan
  }

  const handleDeletePlan = (id_plan) => {
    setManagementPlans(managementPlans.filter((plan) => plan.id !== id_plan))
  }

  const handleDeleteSimulation = (simulationId) => {
    pocketbase.deleteSimulation(tile.id, simulationId)
    if (selectedSimulationId === simulationId) {
      setSelectedSimulationId(null)
    }
  }

  const handleCreateSimulation = async () => {
    try {
      const simulation = await pocketbase.createSimulation(
        tile,
        simulationOptions
      )
      setSelectedSimulationId(simulation.id)
    } catch (error) {
      console.error('Failed to create simulation:', error.message)
      alert('Failed to create simulation: ' + error.message)
    }
  }

  if (!tile) return null

  return (
    <Box w="100%" h="100%">
      <Stack h="100%" gap="md">
        <ContentCell>
          <ContentLayout
            sidebar={
              <ManagementPlanItemList
                managementPlans={managementPlans}
                selectedPlanId={selectedPlanId}
                onSelect={setSelectedPlanId}
                onDelete={handleDeletePlan}
                onCreatePlan={createManagementPlan}
              />
            }
            main={<ManagementPlanView id_managementPlan={selectedPlanId} />}
          />
        </ContentCell>

        <ContentCell>
          <ContentLayout
            sidebar={
              <SimulationItemList
                simulations={tile.simulations}
                selectedSimulationId={selectedSimulationId}
                onSelect={setSelectedSimulationId}
                onDelete={handleDeleteSimulation}
                onCreateSimulation={handleCreateSimulation}
              />
            }
            main={<SimulationChartView id_simulation={selectedSimulationId} />}
          />
        </ContentCell>
      </Stack>
    </Box>
  )
}

export default Dashboard
