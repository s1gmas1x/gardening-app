import { defineStore } from 'pinia'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlantStore } from 'src/stores/plant-store'
import { usePlanningStore } from 'src/stores/planning-store'

const STORAGE_KEY = 'gardening-app:schedule'

function createDefaultState() {
  return {
    taskStatusById: {},
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function buildPersistedSnapshot(state) {
  return {
    version: 1,
    state: {
      taskStatusById: state.taskStatusById,
    },
  }
}

function hydrateState(snapshot) {
  const defaults = createDefaultState()
  const source = snapshot?.state

  if (!source || typeof source !== 'object') {
    return defaults
  }

  return {
    ...defaults,
    taskStatusById: source.taskStatusById && typeof source.taskStatusById === 'object'
      ? source.taskStatusById
      : {},
  }
}

function buildTaskId(areaId, plantId, taskType) {
  return `task:${areaId}:${plantId}:${taskType}`
}

function buildTaskTitle(taskType, plantName, quantity, areaName) {
  if (taskType === 'start_indoors') {
    return `Start ${quantity} ${plantName} indoors for ${areaName}`
  }

  if (taskType === 'transplant') {
    return `Transplant ${quantity} ${plantName} into ${areaName}`
  }

  return `Direct sow ${quantity} ${plantName} in ${areaName}`
}

export const useScheduleStore = defineStore('schedule', {
  state: createDefaultState,

  getters: {
    plantingTasks(state) {
      const gardenStore = useGardenStore()
      const plantStore = usePlantStore()
      const planningStore = usePlanningStore()

      return planningStore.cropPlans.flatMap((cropPlan) => {
        const area = gardenStore.beds.find((bed) => bed.id === cropPlan.areaId)
        const plant = plantStore.getPlantById(cropPlan.plantId)

        if (!area || !plant || cropPlan.targetQuantity <= 0) {
          return []
        }

        const placedCount = planningStore.getPlantingsByAreaId(cropPlan.areaId)
          .filter((planting) => planting.plantId === cropPlan.plantId)
          .length
        const remainingCount = Math.max(cropPlan.targetQuantity - placedCount, 0)
        const tasks = []

        if (cropPlan.method === 'indoor_start') {
          const taskId = buildTaskId(cropPlan.areaId, cropPlan.plantId, 'start_indoors')
          tasks.push({
            id: taskId,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            taskType: 'start_indoors',
            quantity: cropPlan.targetQuantity,
            title: buildTaskTitle('start_indoors', plant.name, cropPlan.targetQuantity, area.name),
            plantName: plant.name,
            areaName: area.name,
            notes: cropPlan.notes,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        if ((cropPlan.method === 'transplant' || cropPlan.method === 'indoor_start') && remainingCount > 0) {
          const taskId = buildTaskId(cropPlan.areaId, cropPlan.plantId, 'transplant')
          tasks.push({
            id: taskId,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            taskType: 'transplant',
            quantity: remainingCount,
            title: buildTaskTitle('transplant', plant.name, remainingCount, area.name),
            plantName: plant.name,
            areaName: area.name,
            notes: cropPlan.notes,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        if (cropPlan.method === 'direct_sow' && remainingCount > 0) {
          const taskId = buildTaskId(cropPlan.areaId, cropPlan.plantId, 'direct_sow')
          tasks.push({
            id: taskId,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            taskType: 'direct_sow',
            quantity: remainingCount,
            title: buildTaskTitle('direct_sow', plant.name, remainingCount, area.name),
            plantName: plant.name,
            areaName: area.name,
            notes: cropPlan.notes,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        return tasks
      })
    },
  },

  actions: {
    initializePersistence() {
      if (this._hasInitializedPersistence || !canUseLocalStorage()) {
        return
      }

      this._hasInitializedPersistence = true

      try {
        const rawSnapshot = window.localStorage.getItem(STORAGE_KEY)
        if (rawSnapshot) {
          Object.assign(this, hydrateState(JSON.parse(rawSnapshot)))
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }

      this.$subscribe(
        (_mutation, state) => {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedSnapshot(state)))
        },
        { detached: true },
      )
    },

    setTaskDone(taskId, done) {
      if (!taskId) {
        return
      }

      this.taskStatusById = {
        ...this.taskStatusById,
        [taskId]: Boolean(done),
      }
    },
  },
})
