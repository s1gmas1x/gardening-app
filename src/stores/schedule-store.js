import { defineStore } from 'pinia'
import { suggestFrostDates } from 'src/services/frost-dates'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlantStore } from 'src/stores/plant-store'
import { usePlanningStore } from 'src/stores/planning-store'
import { usePropagationStore } from 'src/stores/propagation-store'

const STORAGE_KEY = 'gardening-app:schedule'

function createDefaultState() {
  return {
    zipCode: '',
    locationName: '',
    stateCode: '',
    latitude: null,
    longitude: null,
    lastFrostDate: '',
    firstFrostDate: '',
    suggestedFrostDates: null,
    taskStatusById: {},
    zipLookupPending: false,
    zipLookupError: '',
    frostSuggestionPending: false,
    frostSuggestionError: '',
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function buildPersistedSnapshot(state) {
  return {
    version: 1,
    state: {
      zipCode: state.zipCode,
      locationName: state.locationName,
      stateCode: state.stateCode,
      latitude: state.latitude,
      longitude: state.longitude,
      lastFrostDate: state.lastFrostDate,
      firstFrostDate: state.firstFrostDate,
      suggestedFrostDates: state.suggestedFrostDates,
      taskStatusById: state.taskStatusById,
    },
  }
}

function normalizeDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function normalizeSuggestedFrostDates(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    source: typeof value.source === 'string' ? value.source : 'unknown',
    zipCode: typeof value.zipCode === 'string' ? value.zipCode : '',
    locationName: typeof value.locationName === 'string' ? value.locationName : '',
    lastFrostDate: normalizeDateString(value.lastFrostDate),
    firstFrostDate: normalizeDateString(value.firstFrostDate),
    confidence: typeof value.confidence === 'string' ? value.confidence : 'suggested',
    notes: typeof value.notes === 'string' ? value.notes : '',
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
    zipCode: typeof source.zipCode === 'string' ? source.zipCode : '',
    locationName: typeof source.locationName === 'string' ? source.locationName : '',
    stateCode: typeof source.stateCode === 'string' ? source.stateCode : '',
    latitude: Number.isFinite(Number(source.latitude)) ? Number(source.latitude) : null,
    longitude: Number.isFinite(Number(source.longitude)) ? Number(source.longitude) : null,
    lastFrostDate: normalizeDateString(source.lastFrostDate),
    firstFrostDate: normalizeDateString(source.firstFrostDate),
    suggestedFrostDates: normalizeSuggestedFrostDates(source.suggestedFrostDates),
    taskStatusById: source.taskStatusById && typeof source.taskStatusById === 'object'
      ? source.taskStatusById
      : {},
  }
}

function addDays(dateString, days) {
  if (!dateString) {
    return ''
  }

  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
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

function compareTasks(a, b) {
  if (a.done !== b.done) {
    return a.done ? 1 : -1
  }

  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) {
      return 1
    }

    if (!b.dueDate) {
      return -1
    }

    return a.dueDate.localeCompare(b.dueDate)
  }

  const typeOrder = {
    start_indoors: 0,
    direct_sow: 1,
    transplant: 2,
  }

  return (typeOrder[a.taskType] ?? 99) - (typeOrder[b.taskType] ?? 99)
    || a.areaName.localeCompare(b.areaName)
    || a.plantName.localeCompare(b.plantName)
}

export const useScheduleStore = defineStore('schedule', {
  state: createDefaultState,

  getters: {
    plantingTasks(state) {
      const gardenStore = useGardenStore()
      const plantStore = usePlantStore()
      const planningStore = usePlanningStore()
      const propagationStore = usePropagationStore()

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
        const trayAssignments = propagationStore.trayAssignments
          .filter((assignment) => assignment.cropPlanId === cropPlan.id)
        const assignedCells = trayAssignments.reduce((sum, assignment) => sum + assignment.cellCount, 0)
        const progressedCells = trayAssignments
          .filter((assignment) => assignment.status !== 'planned')
          .reduce((sum, assignment) => sum + assignment.cellCount, 0)
        const readyToTransplantCells = trayAssignments
          .filter((assignment) => assignment.status === 'ready_to_transplant')
          .reduce((sum, assignment) => sum + assignment.cellCount, 0)
        const tasks = []

        if (cropPlan.method === 'indoor_start') {
          const remainingIndoorStartCount = Math.max(cropPlan.targetQuantity - progressedCells, 0)

          if (remainingIndoorStartCount > 0) {
          const taskId = buildTaskId(cropPlan.areaId, cropPlan.plantId, 'start_indoors')
          tasks.push({
            id: taskId,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            taskType: 'start_indoors',
            quantity: remainingIndoorStartCount,
            title: buildTaskTitle('start_indoors', plant.name, remainingIndoorStartCount, area.name),
            plantName: plant.name,
            areaName: area.name,
            targetQuantity: cropPlan.targetQuantity,
            placedCount,
            remainingCount,
            dueDate: addDays(state.lastFrostDate, -7 * (plant.sowBeforeLastFrostWeeks ?? 0)),
            progressText: `${progressedCells}/${cropPlan.targetQuantity} sown or beyond · ${assignedCells}/${cropPlan.targetQuantity} assigned to trays`,
            notes: cropPlan.notes,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }
        }

        if (cropPlan.method === 'indoor_start' && readyToTransplantCells > 0) {
          const taskId = buildTaskId(cropPlan.areaId, cropPlan.plantId, 'transplant')
          tasks.push({
            id: taskId,
            cropPlanId: cropPlan.id,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            taskType: 'transplant',
            quantity: readyToTransplantCells,
            title: buildTaskTitle('transplant', plant.name, readyToTransplantCells, area.name),
            plantName: plant.name,
            areaName: area.name,
            targetQuantity: cropPlan.targetQuantity,
            placedCount,
            remainingCount,
            dueDate: addDays(state.lastFrostDate, 7 * (plant.transplantAfterLastFrostWeeks ?? 0)),
            progressText: `${readyToTransplantCells} tray cells ready to transplant`,
            notes: cropPlan.notes,
            canMarkTransplanted: true,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        if (cropPlan.method === 'transplant' && remainingCount > 0) {
          const taskId = buildTaskId(cropPlan.areaId, cropPlan.plantId, 'transplant')
          tasks.push({
            id: taskId,
            cropPlanId: cropPlan.id,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            taskType: 'transplant',
            quantity: remainingCount,
            title: buildTaskTitle('transplant', plant.name, remainingCount, area.name),
            plantName: plant.name,
            areaName: area.name,
            targetQuantity: cropPlan.targetQuantity,
            placedCount,
            remainingCount,
            dueDate: addDays(state.lastFrostDate, 7 * (plant.transplantAfterLastFrostWeeks ?? 0)),
            progressText: `${placedCount}/${cropPlan.targetQuantity} placed`,
            notes: cropPlan.notes,
            canMarkTransplanted: false,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        if (cropPlan.method === 'direct_sow' && remainingCount > 0) {
          const taskId = buildTaskId(cropPlan.areaId, cropPlan.plantId, 'direct_sow')
          tasks.push({
            id: taskId,
            cropPlanId: cropPlan.id,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            taskType: 'direct_sow',
            quantity: remainingCount,
            title: buildTaskTitle('direct_sow', plant.name, remainingCount, area.name),
            plantName: plant.name,
            areaName: area.name,
            targetQuantity: cropPlan.targetQuantity,
            placedCount,
            remainingCount,
            dueDate: addDays(state.lastFrostDate, 7 * (plant.directSowAfterLastFrostWeeks ?? 0)),
            progressText: `${placedCount}/${cropPlan.targetQuantity} placed`,
            notes: cropPlan.notes,
            canMarkTransplanted: false,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        return tasks
      }).sort(compareTasks)
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

    updateScheduleSettings(updates = {}) {
      if (Object.hasOwn(updates, 'zipCode')) {
        this.zipCode = typeof updates.zipCode === 'string' ? updates.zipCode : this.zipCode
      }

      if (Object.hasOwn(updates, 'lastFrostDate')) {
        this.lastFrostDate = normalizeDateString(updates.lastFrostDate)
      }

      if (Object.hasOwn(updates, 'firstFrostDate')) {
        this.firstFrostDate = normalizeDateString(updates.firstFrostDate)
      }
    },

    async lookupZipCode() {
      const normalizedZipCode = this.zipCode.trim()

      if (!/^\d{5}$/.test(normalizedZipCode)) {
        this.zipLookupError = 'Enter a valid 5-digit ZIP code.'
        return false
      }

      this.zipLookupPending = true
      this.zipLookupError = ''

      try {
        const response = await fetch(`https://api.zippopotam.us/us/${normalizedZipCode}`)

        if (!response.ok) {
          throw new Error('ZIP lookup failed.')
        }

        const data = await response.json()
        const place = data.places?.[0]

        if (!place) {
          throw new Error('ZIP lookup returned no places.')
        }

        this.locationName = place['place name'] ?? ''
        this.stateCode = place['state abbreviation'] ?? place.state ?? ''
        this.latitude = Number.isFinite(Number(place.latitude)) ? Number(place.latitude) : null
        this.longitude = Number.isFinite(Number(place.longitude)) ? Number(place.longitude) : null
        return true
      } catch {
        this.zipLookupError = 'Unable to look up that ZIP code right now.'
        return false
      } finally {
        this.zipLookupPending = false
      }
    },

    async suggestFrostDates() {
      if (!this.zipCode.trim()) {
        this.frostSuggestionError = 'Enter a ZIP code before requesting a frost-date suggestion.'
        return false
      }

      this.frostSuggestionPending = true
      this.frostSuggestionError = ''

      try {
        this.suggestedFrostDates = await suggestFrostDates({
          zipCode: this.zipCode.trim(),
          locationName: this.locationName,
          stateCode: this.stateCode,
          latitude: this.latitude,
          longitude: this.longitude,
        })
        return true
      } catch {
        this.frostSuggestionError = 'Unable to suggest frost dates right now.'
        return false
      } finally {
        this.frostSuggestionPending = false
      }
    },

    applySuggestedFrostDates() {
      if (!this.suggestedFrostDates) {
        return false
      }

      this.lastFrostDate = normalizeDateString(this.suggestedFrostDates.lastFrostDate) || this.lastFrostDate
      this.firstFrostDate = normalizeDateString(this.suggestedFrostDates.firstFrostDate) || this.firstFrostDate
      return true
    },

    pruneTaskStatus(validTaskIds) {
      const validIds = new Set(validTaskIds)
      this.taskStatusById = Object.fromEntries(
        Object.entries(this.taskStatusById).filter(([taskId]) => validIds.has(taskId)),
      )
    },
  },
})
