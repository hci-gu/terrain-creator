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
} from '@mantine/core'
import { useAtomValue, useSetAtom, useAtom } from 'jotai'
import { getTileAtom, managementPlansAtom } from '@state' 
import TileLandcoverDrawingEditor from '@components/TileLandcoverDrawingEditor'
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
  const tile = useAtomValue(getTileAtom(id_tile))
  const [managementPlans, setManagementPlans] = useAtom(managementPlansAtom(id_tile))
  const [selectedPlanId, setSelectedPlanId] = useState(null)

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
      <Container fluid>
        <Breadcrumbs pt="md" pb="md">
          <Anchor onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            Home
          </Anchor>
          <Anchor
            onClick={() => navigate(`/tiles`)}
            style={{ cursor: 'pointer' }}
          >
            Tiles
          </Anchor>
        </Breadcrumbs>
        {/* Dashboard Layout */}
        <Flex
          justify="center"
          align="stretch"
          direction="row"
          wrap="wrap"
          gap="lg"
          h="100vh"
          w="100%"
        >
          {/* Section 1: Tile View */}
          <TileLandcoverDrawingEditor tile_id={id_tile} />

          <Divider orientation="vertical" />

          {/* Section 2: Management Plans */}
          <Stack>
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
                setSelectedPlanId(id)
                handleNavigateToEditor(id)
              }}
              onDelete={handleDeletePlan}
              renderItemContent={renderPlanContent}
            />
          </Stack>

          <Divider orientation="vertical" />

          {/* Section 3: Simulation Chart View */}
          <SimulationChartView tile={tile} />
        </Flex>
      </Container>
    </Suspense>
  )
}

export default Dashboard
