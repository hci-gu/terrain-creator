import PocketBase from 'pocketbase'
import tilebelt from '@mapbox/tilebelt'
import * as turf from '@turf/turf'
import cover from '@mapbox/tile-cover'
import axios from 'axios'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const PB_URL = import.meta.env.VITE_PB_URL
const SIMULATION_URL = import.meta.env.VITE_SIMULATION_URL
const pb = new PocketBase(PB_URL)
pb.autoCancellation(false)

export const minTilesForCoords = (coords, initialZoom = 10) => {
  var line = turf.lineString(coords)
  var bbox = turf.bbox(line)
  const bboxPolygon = turf.bboxPolygon(bbox)

  const tiles = cover.tiles(bboxPolygon.geometry, {
    min_zoom: initialZoom + 1,
    max_zoom: initialZoom + 1,
  })
  // tile is [x, y, zoom]
  // sort the tiles by x and y
  tiles.sort((a, b) => {
    if (a[1] === b[1]) {
      return a[0] - b[0]
    }
    return a[1] - b[1]
  })

  // flip second part of array
  const half = Math.ceil(tiles.length / 2)
  const top = tiles.slice(0, half)
  const bottom = tiles.slice(half, tiles.length).reverse()

  return [...top, ...bottom]
}

const emptyLandcover = () => ({
  id: '-',
  url: `${import.meta.env.VITE_URL}/images/loading.png`,
  coverage: {},
})

const mapLandcover = (landcover) => {
  return landcover
    ? {
        id: landcover.id,
        url: convertFileToUrl(
          landcover.collectionId,
          landcover.id,
          landcover.color
        ),
        url_small: convertFileToUrl(
          landcover.collectionId,
          landcover.id,
          landcover.color_100
        ),
        coverage: landcover.coverage,
      }
    : emptyLandcover()
}
const mapOceanData = (oceanData) => {
  return oceanData
    ? {
        id: oceanData.id,
        depth_url: convertFileToUrl(
          oceanData.collectionId,
          oceanData.id,
          oceanData.depth
        ),
        velocity_url: convertFileToUrl(
          oceanData.collectionId,
          oceanData.id,
          oceanData.water_velocity
        ),
        temperature_url: convertFileToUrl(
          oceanData.collectionId,
          oceanData.id,
          oceanData.water_temperature
        ),
      }
    : null
}

const mapTimestep = (timestep) => {
  return {
    id: timestep.id,
    index: timestep.index,
    data: timestep.data,
  }
}

const mapSimulation = (simulation) => {
  return {
    id: simulation.id,
    created: new Date(simulation.created),
    options: simulation.options,
    plan: simulation.plan,
  }
}

const mapTile = (tile) => {
  const landcover = tile.expand?.landcover
  const heightmap = tile.expand?.heightmap
  const oceanData = tile.expand?.oceanData
  const simulations = tile.expand?.simulations ?? []
  const center = [
    (tile.bbox[0] + tile.bbox[2]) / 2,
    (tile.bbox[1] + tile.bbox[3]) / 2,
  ]
  return {
    id: tile.id,
    bbox: tile.bbox,
    center,
    landcover: mapLandcover(landcover),
    oceanData: mapOceanData(oceanData),
    heightmap: heightmap
      ? {
          id: heightmap.id,
          url: convertFileToUrl(
            heightmap.collectionId,
            heightmap.id,
            heightmap.heightmap
          ),
        }
      : {},
    satellite: convertFileToUrl(tile.collectionId, tile.id, tile.satellite),
    simulations: simulations.map(mapSimulation),
  }
}

const mapManagementPlan = (plan) => {
  return {
    id: plan.id,
    name: plan.name,
    created: new Date(plan.created),
    tasks: plan.expand?.tasks?.map(mapTask) || [],
  }
}

const mapTask = (task) => {
  return {
    id: task.id,
    name: task.name,
    type: task.type,
    start: new Date(task.start),
    end: task.end ? new Date(task.end) : new Date(),
    data: task.data || {},
  }
}

export const ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
}

export const convertFileToUrl = (collectionId, recordId, filename) =>
  `${PB_URL}/api/files/${collectionId}/${recordId}/${filename}`

export const file = (collectionId, recordId, filename) =>
  `${PB_URL}/api/files/${collectionId}/${recordId}/${filename}`

export const getTiles = () =>
  pb
    .collection('tiles')
    .getFullList({
      expand: 'landcover,heightmap,oceanData,simulations',
    })
    .then((tiles) => tiles.map(mapTile))

export const getManagementPlans = () => {
  return pb
    .collection('managementPlans')
    .getFullList({
      expand: 'tasks',
    })
    .then((plans) => plans.map(mapManagementPlan))
}

export const createManagementPlan = () => {
  return pb.collection('managementPlans').create({
    name: 'New Management Plan',
  })
}

export const updateManagementPlan = (id, data) => {
  return pb.collection('managementPlans').update(id, data)
}

export const deleteManagementPlan = (id) => {
  return pb.collection('managementPlans').delete(id)
}

export const createTask = async (plan) => {
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const task = await pb.collection('tasks').create({
    name: 'New Task',
    type: 'landcover',
    start: lastMonth,
    end: new Date(),
  })

  await pb.collection('managementPlans').update(plan.id, {
    tasks: [...(plan.tasks.map((task) => task.id) || []), task.id],
  })
  return mapTask(task)
}

export const updateTask = async (taskId, taskData) => {
  return pb.collection('tasks').update(taskId, taskData)
}

export const deleteTask = async (taskId) => {
  return pb.collection('tasks').delete(taskId)
}

export const createTiles = ({ coords, zoom }) => {
  const tiles = minTilesForCoords(coords, zoom)

  for (const tile of tiles) {
    const bbox = tilebelt.tileToBBOX(tile)
    pb.collection('tiles').create({
      x: tile[0],
      y: tile[1],
      zoom: tile[2],
      bbox,
    })
  }
}

export const createLandcover = async (tileId, file) => {
  const { id } = await pb.collection('landcovers').create({
    original: file,
  })
  await updateTile(tileId, { landcover: id })
}

export const updateLandCover = async (id, file) => {
  await pb.collection('landcovers').update(id, {
    color: file,
  })
  // await updateTile(tileId, { landcover: id })
}

export const createHeightMap = async (tileId, file) => {
  const { id } = await pb.collection('heightmaps').create({
    original: file,
  })
  await updateTile(tileId, { heightmap: id })
}

export const updateTile = (id, data) => pb.collection('tiles').update(id, data)

export const getSimulations = () => pb.collection('simulations').getFullList()

export const getSimulation = (id) =>
  pb.collection('simulations').getOne(id).then(mapSimulation)

export const timestepsForSimulation = (id) =>
  pb.collection('timesteps').getFullList({
    filter: `simulation = "${id}"`,
  })

export const getSimulationAgents = async () => {
  const agentsResponse = await axios.get(`${SIMULATION_URL}/simulate/agents`)

  return agentsResponse.data
}

const simulationOptionsFromManagementPlan = (plan) => {
  const options = {}
  // get min date from tasks
  const minDate = new Date(
    Math.min(...plan.tasks.map((t) => new Date(t.start)))
  )
  const maxDate = new Date(
    Math.max(...plan.tasks.map((t) => new Date(t.end || t.start)))
  )
  options.start = minDate.toISOString()
  options.end = maxDate.toISOString()
  options.tasks = plan.tasks.map((task) => {
    return {
      id: task.id,
      name: task.name,
      type: task.type,
      start: task.start.toISOString(),
      end: task.end ? task.end.toISOString() : null,
      data: task.data || {},
    }
  })

  return options
}

export const createSimulation = async (tile, managementPlanId) => {
  if (!tile?.landcover?.url_small || !tile?.oceanData?.depth_url) {
    throw new Error('Missing required tile data for simulation')
  }

  const tileTexture = await axios.get(tile.landcover.url_small, {
    responseType: 'arraybuffer',
  })
  const oceanDepthMap = await axios.get(tile.oceanData.depth_url, {
    responseType: 'arraybuffer',
  })
  const textureFile = new File([tileTexture.data], 'landcover.png', {
    type: 'image/png',
  })
  const depthFile = new File([oceanDepthMap.data], 'depth.png', {
    type: 'image/png',
  })

  // Prepare the form data for the upload
  const formData = new FormData()
  formData.append('texture', textureFile)
  formData.append('depth', depthFile)
  const managementPlan = mapManagementPlan(
    await pb.collection('managementPlans').getOne(managementPlanId, {
      expand: 'tasks',
    })
  )

  const simulationOptions = simulationOptionsFromManagementPlan(managementPlan)

  formData.append('options', JSON.stringify(simulationOptions))

  const uploadResponse = await axios.post(
    `${SIMULATION_URL}/simulate/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  const simulationId = uploadResponse.data.id

  await wait(500)

  // Step 2: Stream simulation results using EventSource
  const eventSource = new EventSource(
    `${SIMULATION_URL}/simulate/${simulationId}`
  )
  const simulation = await pb.collection('simulations').create({
    options: simulationOptions,
    plan: managementPlanId,
  })
  const updatedSimulations = tile.simulations
    ? [simulation.id, ...tile.simulations.map((s) => s.id)]
    : [simulation.id]
  await updateTile(tile.id, {
    simulations: updatedSimulations,
  })

  const timesteps = []

  eventSource.onmessage = async (event) => {
    if (event.data === '[DONE]') {
      eventSource.close() // Close the connection when done
      return
    }
    const data = JSON.parse(event.data)

    if (data) {
      // Process each step and save it to the database
      const timestep = await pb.collection('timesteps').create({
        simulation: simulation.id,
        index: data.index,
        data: data.data,
      })
      timesteps.push(timestep.id)
    }
  }

  eventSource.onerror = (err) => {
    console.error('Error while streaming simulation:', err)
    eventSource.close() // Close the connection on error
  }

  return simulation
}

export const deleteSimulation = async (tileId, simulationId) => {
  const tile = await pb.collection('tiles').getOne(tileId)
  await updateTile(tileId, {
    simulations: tile.simulations.filter((id) => id !== simulationId),
  })
  await pb.collection('simulations').delete(simulationId)
}

export const subscribe = (
  collection,
  event,
  callback,
  remap = false,
  expand = ''
) => {
  if (!pb) return
  return pb.collection(collection).subscribe(
    event,
    (e) => {
      console.log(`${collection}, ${e.action}, ${e.record.id}`)
      let record = e.record
      if (remap) {
        switch (collection) {
          case 'tiles':
            record = mapTile(record)
            break
          case 'landcovers':
            record = mapLandcover(record)
            break
          case 'simulations':
            record = mapSimulation(record)
            break
          case 'timesteps':
            record = mapTimestep(record)
          default:
            break
        }
      }
      callback({
        action: e.action,
        record,
      })
    },
    { expand }
  )
}
export const unsubscribe = (collection, event) => {
  if (!pb) return
  return pb.collection(collection).unsubscribe([event])
}
