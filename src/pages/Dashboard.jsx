import React, { useState, Suspense } from 'react'
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
} from '@mantine/core'
import { useAtomValue, useSetAtom, useAtom } from 'jotai'
import { getTileByIdAtom, managementPlansAtom } from '@state' 
import ManagementPlanView from '@pages/management_plan/ManagementPlanView'
import { SimulationChartView } from '@components/SimulationChartView'
import ItemList from '@components/ItemList'

// Mock function
const getManagementPlansForTile = (id_tile) => {
  console.log('Fetching plans for tile:', id_tile)
  return [
    {
      id: '0',
      name: 'Reforestation Plan 2025',
      created: new Date(),
    },
    {
      id: '1',
      name: 'Water Management Alpha',
      created: new Date(Date.now() - 86400000),
    },
  ]
}

const Dashboard = () => {
  const { id_tile } = useParams()
  const navigate = useNavigate()
  const tile = useAtomValue(getTileByIdAtom(id_tile))
  const [managementPlans, setManagementPlans] = useAtom(managementPlansAtom)
  const [selectedPlanId, setSelectedPlanId] = useState(0)

  const renderPlanContent = (plan) => (
    <Flex direction="column">
      <Text fw={500}>{plan.name}</Text>
      <Text fz="sm" c="dimmed">
        Created: {plan.created.toLocaleDateString()}
      </Text>
    </Flex>
  )

  const createManagementPlan = (planName) => {
    const newPlan = {
      id: managementPlans.length,
      name: planName ? planName : `Management Plan ${managementPlans.length + 1}`,
      created: new Date(),
      tile: tile
    }
    setManagementPlans([...managementPlans, newPlan])
    return newPlan
  }

  const handleDeletePlan = (id_plan) => {
    setManagementPlans(managementPlans.filter(plan => plan.id !== id_plan))
  }
  const handleNavigateToEditor = (id_plan = 'new') => {
    navigate(`management_plan_editor/${id_plan}`)
  }

  if (!tile) return null

  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <Container fluid p="xl">
        <Stack>
          <Flex
            justify="flex-start"
            align="flex-start"
            direction="row"
            wrap="nowrap"
            gap="md"
          >

            <Image
              src={tile.landcover.url}
              alt="Landcover"
              fit="contain"
              w={512}
              h={512}
            />

            <ManagementPlanView id_managementPlan={selectedPlanId} />

            <Stack style={{ overflow: 'scroll', maxHeight: '100%', minWidth: '300px'}}>
              <Text size="xl" fw={500}>
                Management Plans
              </Text>
              <Button variant="filled" onClick={() => createManagementPlan()}>
                New Plan
              </Button>
              <ItemList
                items={managementPlans}
                selectedId={selectedPlanId}
                onSelect={(id) => {
                  console.log('selectedPlanId:', id)
                  setSelectedPlanId(id)
                  // handleNavigateToEditor(id)
                }}
                onDelete={handleDeletePlan}
                renderItemContent={renderPlanContent}
              />
            </Stack>

          </Flex>
          <SimulationChartView tile={tile} />
        </Stack>
      </Container>
    </Suspense>
  )
}

export default Dashboard
