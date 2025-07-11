import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Stack, Box, Paper, Flex, Divider, Center, Text } from '@mantine/core'
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
    <Divider orientation="vertical" />
    <Box h="100%" miw="0" flex="auto">
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

  const createManagementPlan = async () => {
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

  const managementPlan = managementPlans.find(
    (plan) => plan.id === selectedPlanId
  )
  const simulations = tile.simulations.filter(
    (sim) => sim.plan === selectedPlanId
  )

  return (
    <Box w="100%" h="100%">
      <Stack h="100%" gap="4px">
        <ContentCell flexBasis="30%">
          <ContentLayout
            sidebar={
              <ManagementPlanItemList
                managementPlans={managementPlans}
                selectedPlanId={selectedPlanId}
                onSelect={(id) => {
                  startTransition(() => {
                    setSelectedSimulationId(null)
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

        <ContentCell flexBasis="70%">
          <ContentLayout
            sidebar={
              <SimulationItemList
                simulations={simulations}
                selectedSimulationId={selectedSimulationId}
                onSelect={setSelectedSimulationId}
                onDelete={handleDeleteSimulation}
                onCreateSimulation={handleCreateSimulation}
              />
            }
            main={
              selectedSimulationId ? (
                <SimulationChartView
                  simulationId={selectedSimulationId}
                  managementPlan={managementPlan}
                />
              ) : (
                <Center h="100%">
                  <Text c="dimmed">No simulation selected</Text>
                </Center>
              )
            }
          />
        </ContentCell>
      </Stack>
    </Box>
  )
}

export default Dashboard
