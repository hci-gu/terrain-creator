import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Stack, Box, Paper, Flex } from '@mantine/core'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  getTileByIdAtom,
  managementPlansAtom,
  refreshManagementPlansAtom,
} from '@state'
import { ManagementPlanView } from '@/components/ManagementPlanView'
import { SimulationChartView } from '@components/SimulationChartView'
import { ManagementPlanItemList } from '@components/ManagementPlanItemList'
import { SimulationItemList } from '@components/SimulationItemList'
import * as pocketbase from '@/pocketbase'
import { startTransition } from 'react'

export const ContentCell = ({ children, flexBasis = '50%', ...props }) => (
  <Paper
    flex={`1 1 ${flexBasis}`}
    w="100%"
    p="xs"
    shadow="xl"
    radius="md"
    withBorder
    style={{ minHeight: 0 }}
    {...props}
  >
    {children}
  </Paper>
)

export const ContentLayout = ({ sidebar, main }) => (
  <Flex
    justify="flex-start"
    align="flex-start"
    direction="row"
    wrap="nowrap"
    gap="md"
    h="100%"
    miw="0"
  >
    <Box h="100%" w="30vw" miw="200" maw="500" flex="0 0 20%">
      {sidebar}
    </Box>

    <Box
      h="100%"
      miw="0"
      flex="auto"
      // style={{ overflowX: 'auto' }}
    >
      {main}
    </Box>
  </Flex>
)

const Dashboard = () => {
  const { id_tile } = useParams()
  const tile = useAtomValue(getTileByIdAtom(id_tile))
  const refreshPlans = useSetAtom(refreshManagementPlansAtom)
  const managementPlans = useAtomValue(managementPlansAtom)

  const [selectedPlanId, setSelectedPlanId] = useState(0)
  const [selectedSimulationId, setSelectedSimulationId] = useState(null)

  useEffect(() => {
    if (tile && tile.simulations && tile.simulations.length > 0) {
      setSelectedSimulationId(tile.simulations[0].id)
    }
  }, [tile])

  const createManagementPlan = async () => {
    // const newPlan = {
    //   id: Date.now(),
    //   name: planName ? planName : 'New Management Plan',
    //   created: new Date(),
    //   tasks: [],
    // }
    const newPlan = await pocketbase.createManagementPlan()
    refreshPlans()
    return newPlan
  }

  const handleDeletePlan = async (planId) => {
    await pocketbase.deleteManagementPlan(planId)
    refreshPlans()
  }

  const handleDeleteSimulation = (simulationId) => {
    pocketbase.deleteSimulation(tile.id, simulationId)
    if (selectedSimulationId === simulationId) {
      setSelectedSimulationId(null)
    }
  }

  const handleCreateSimulation = async () => {
    if (!tile || !selectedPlanId) {
      alert('Please select a management plan before creating a simulation.')
      return
    }

    try {
      const simulation = await pocketbase.createSimulation(tile, selectedPlanId)
      setSelectedSimulationId(simulation.id)
    } catch (error) {
      console.error('Failed to create simulation:', error.message)
      alert('Failed to create simulation: ' + error.message)
    }
  }

  if (!tile) return null

  return (
    <Box w="100%" h="100%">
      <Stack h="100%" gap="6px">
        <ContentCell flexBasis="60%">
          <ContentLayout
            sidebar={
              <ManagementPlanItemList
                managementPlans={managementPlans}
                selectedPlanId={selectedPlanId}
                onSelect={(id) => {
                  startTransition(() => {
                    setSelectedPlanId(id)
                  })
                }}
                onDelete={handleDeletePlan}
                onCreatePlan={() => createManagementPlan()}
              />
            }
            main={<ManagementPlanView tile={tile} id={selectedPlanId} />}
          />
        </ContentCell>

        <ContentCell flexBasis="40%">
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
