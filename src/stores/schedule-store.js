import { defineStore } from 'pinia'
import { suggestFrostDates } from 'src/services/frost-dates'
import { suggestGrowingZone } from 'src/services/growing-zone'
import { getWeatherSnapshot } from 'src/services/weather'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlantStore } from 'src/stores/plant-store'
import { usePlanningStore } from 'src/stores/planning-store'
import { usePropagationStore } from 'src/stores/propagation-store'
import { buildPlantingBatch } from 'src/utils/planting-batches'

const STORAGE_KEY = 'gardening-app:schedule'
const WEATHER_STALE_AFTER_MS = 10 * 60 * 1000

function createDefaultState() {
  return {
    zipCode: '',
    locationName: '',
    stateCode: '',
    locationDisplayName: '',
    latitude: null,
    longitude: null,
    usdaZone: '',
    averageLastFrostDate: '',
    averageFirstFrostDate: '',
    lastFrostDate: '',
    firstFrostDate: '',
    suggestedFrostDates: null,
    growingZoneSuggestion: null,
    currentConditions: null,
    dailyForecast: [],
    hourlyForecast: [],
    activeAlerts: [],
    lastUpdatedAt: '',
    taskStatusById: {},
    zipLookupPending: false,
    zipLookupError: '',
    frostSuggestionPending: false,
    frostSuggestionError: '',
    weatherPending: false,
    weatherError: '',
    growingZonePending: false,
    growingZoneError: '',
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
      locationDisplayName: state.locationDisplayName,
      usdaZone: state.usdaZone,
      averageLastFrostDate: state.averageLastFrostDate,
      averageFirstFrostDate: state.averageFirstFrostDate,
      lastFrostDate: state.lastFrostDate,
      firstFrostDate: state.firstFrostDate,
      suggestedFrostDates: state.suggestedFrostDates,
      growingZoneSuggestion: state.growingZoneSuggestion,
      currentConditions: state.currentConditions,
      dailyForecast: state.dailyForecast,
      hourlyForecast: state.hourlyForecast,
      activeAlerts: state.activeAlerts,
      lastUpdatedAt: state.lastUpdatedAt,
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

function normalizeGrowingZoneSuggestion(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    source: typeof value.source === 'string' ? value.source : 'unknown',
    zipCode: typeof value.zipCode === 'string' ? value.zipCode : '',
    locationName: typeof value.locationName === 'string' ? value.locationName : '',
    zone: typeof value.zone === 'string' ? value.zone : '',
    confidence: typeof value.confidence === 'string' ? value.confidence : 'suggested',
    notes: typeof value.notes === 'string' ? value.notes : '',
    rawPayload: value.rawPayload && typeof value.rawPayload === 'object' ? value.rawPayload : null,
  }
}

function normalizeLocationDisplayName(locationName, stateCode) {
  if (locationName && stateCode) {
    return `${locationName}, ${stateCode}`
  }

  return locationName || stateCode || ''
}

function normalizeCurrentConditions(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const temperatureF = Number.isFinite(Number(value.temperatureF)) ? Number(value.temperatureF) : null
  const feelsLikeF = Number.isFinite(Number(value.feelsLikeF)) ? Number(value.feelsLikeF) : null
  const windMph = Number.isFinite(Number(value.windMph)) ? Number(value.windMph) : null
  const windGustMph = Number.isFinite(Number(value.windGustMph)) ? Number(value.windGustMph) : null
  const humidityPercent = Number.isFinite(Number(value.humidityPercent)) ? Number(value.humidityPercent) : null

  return {
    temperatureF,
    feelsLikeF,
    windMph,
    windGustMph,
    humidityPercent,
    summary: typeof value.summary === 'string' ? value.summary : '',
    description: typeof value.description === 'string' ? value.description : '',
    icon: typeof value.icon === 'string' ? value.icon : '',
  }
}

function normalizeForecastEntry(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const date = typeof value.date === 'string' ? value.date : ''

  if (!date) {
    return null
  }

  return {
    date,
    lowTempF: Number.isFinite(Number(value.lowTempF)) ? Number(value.lowTempF) : null,
    highTempF: Number.isFinite(Number(value.highTempF)) ? Number(value.highTempF) : null,
    temperatureF: Number.isFinite(Number(value.temperatureF)) ? Number(value.temperatureF) : null,
    precipitationChancePercent: Number.isFinite(Number(value.precipitationChancePercent))
      ? Number(value.precipitationChancePercent)
      : null,
    windMph: Number.isFinite(Number(value.windMph)) ? Number(value.windMph) : null,
    windGustMph: Number.isFinite(Number(value.windGustMph)) ? Number(value.windGustMph) : null,
    summary: typeof value.summary === 'string' ? value.summary : '',
    description: typeof value.description === 'string' ? value.description : '',
    icon: typeof value.icon === 'string' ? value.icon : '',
  }
}

function normalizeAlert(value, index) {
  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    id: typeof value.id === 'string' ? value.id : `alert-${index}`,
    source: typeof value.source === 'string' ? value.source : '',
    event: typeof value.event === 'string' ? value.event : '',
    headline: typeof value.headline === 'string' ? value.headline : '',
    severity: typeof value.severity === 'string' ? value.severity : '',
    startsAt: typeof value.startsAt === 'string' ? value.startsAt : '',
    endsAt: typeof value.endsAt === 'string' ? value.endsAt : '',
    description: typeof value.description === 'string' ? value.description : '',
    instruction: typeof value.instruction === 'string' ? value.instruction : '',
    areas: Array.isArray(value.areas) ? value.areas.filter((item) => typeof item === 'string') : [],
  }
}

function normalizeWeatherSnapshot(value) {
  if (!value || typeof value !== 'object') {
    return {
      currentConditions: null,
      dailyForecast: [],
      hourlyForecast: [],
      activeAlerts: [],
      lastUpdatedAt: '',
    }
  }

  return {
    currentConditions: normalizeCurrentConditions(value.currentConditions),
    dailyForecast: Array.isArray(value.dailyForecast)
      ? value.dailyForecast.map(normalizeForecastEntry).filter(Boolean)
      : [],
    hourlyForecast: Array.isArray(value.hourlyForecast)
      ? value.hourlyForecast.map(normalizeForecastEntry).filter(Boolean)
      : [],
    activeAlerts: Array.isArray(value.activeAlerts)
      ? value.activeAlerts.map(normalizeAlert).filter(Boolean)
      : [],
    lastUpdatedAt: typeof value.lastUpdatedAt === 'string' ? value.lastUpdatedAt : '',
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
    locationDisplayName: typeof source.locationDisplayName === 'string'
      ? source.locationDisplayName
      : normalizeLocationDisplayName(source.locationName, source.stateCode),
    latitude: null,
    longitude: null,
    usdaZone: typeof source.usdaZone === 'string' ? source.usdaZone : '',
    averageLastFrostDate: normalizeDateString(source.averageLastFrostDate),
    averageFirstFrostDate: normalizeDateString(source.averageFirstFrostDate),
    lastFrostDate: normalizeDateString(source.lastFrostDate),
    firstFrostDate: normalizeDateString(source.firstFrostDate),
    suggestedFrostDates: normalizeSuggestedFrostDates(source.suggestedFrostDates),
    growingZoneSuggestion: normalizeGrowingZoneSuggestion(source.growingZoneSuggestion),
    ...normalizeWeatherSnapshot(source),
    taskStatusById: source.taskStatusById && typeof source.taskStatusById === 'object'
      ? source.taskStatusById
      : {},
  }
}

function buildTaskId(batchId, taskType) {
  return `task:${batchId}:${taskType}`
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
    hasFreezeRisk(state) {
      return state.dailyForecast.some((entry) => entry.lowTempF !== null && entry.lowTempF <= 36)
    },

    hasHeatRisk(state) {
      return state.dailyForecast.some((entry) => entry.highTempF !== null && entry.highTempF >= 88)
    },

    hasWindRisk(state) {
      const currentWind = (state.currentConditions?.windMph ?? 0) >= 25
        || (state.currentConditions?.windGustMph ?? 0) >= 35
      const hourlyWind = state.hourlyForecast.some((entry) => (
        (entry.windMph ?? 0) >= 25
        || (entry.windGustMph ?? 0) >= 35
      ))
      const dailyWind = state.dailyForecast.some((entry) => (
        (entry.windMph ?? 0) >= 25
        || (entry.windGustMph ?? 0) >= 35
      ))

      return currentWind || hourlyWind || dailyWind
    },

    hasActiveWeatherAlerts(state) {
      return state.activeAlerts.length > 0
    },

    plantingBatches(state) {
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
        const inGardenCount = Math.max(
          placedCount,
          planningStore.getInGardenCountByCropPlanId(cropPlan.id),
        )
        const batch = buildPlantingBatch({
          cropPlan,
          area,
          plant,
          placedCount: inGardenCount,
          lastFrostDate: state.lastFrostDate,
          firstFrostDate: state.firstFrostDate,
        })

        return batch ? [batch] : []
      })
    },

    plantingTasks(state) {
      const propagationStore = usePropagationStore()

      return this.plantingBatches.flatMap((batch) => {
        const trayAssignments = propagationStore.trayAssignments
          .filter((assignment) => assignment.batchId === batch.id)
        const assignedCells = trayAssignments.reduce((sum, assignment) => sum + assignment.cellCount, 0)
        const progressedCells = trayAssignments
          .filter((assignment) => assignment.status !== 'planned')
          .reduce((sum, assignment) => sum + assignment.cellCount, 0)
        const readyToTransplantCells = trayAssignments
          .filter((assignment) => assignment.status === 'ready_to_transplant')
          .reduce((sum, assignment) => sum + assignment.cellCount, 0)
        const tasks = []

        if (batch.method === 'indoor_start') {
          const remainingIndoorStartCount = Math.max(batch.targetQuantity - progressedCells, 0)

          if (remainingIndoorStartCount > 0) {
            const taskId = buildTaskId(batch.id, 'start_indoors')
            tasks.push({
              id: taskId,
              batchId: batch.id,
              cropPlanId: batch.cropPlanId,
              areaId: batch.areaId,
              plantId: batch.plantId,
              taskType: 'start_indoors',
              quantity: remainingIndoorStartCount,
              title: buildTaskTitle('start_indoors', batch.plantName, remainingIndoorStartCount, batch.areaName),
              plantName: batch.plantName,
              areaName: batch.areaName,
              targetQuantity: batch.targetQuantity,
              placedCount: batch.placedCount,
              inGardenCount: batch.placedCount,
              remainingCount: batch.remainingCount,
              dueDate: batch.startIndoorDate,
              batchStartIndoorDate: batch.startIndoorDate,
              batchTransplantDate: batch.transplantDate,
              progressText: `${progressedCells}/${batch.targetQuantity} sown or beyond · ${assignedCells}/${batch.targetQuantity} assigned to trays`,
              notes: batch.notes,
              done: Boolean(state.taskStatusById[taskId]),
            })
          }
        }

        if (batch.method === 'indoor_start' && readyToTransplantCells > 0) {
          const taskId = buildTaskId(batch.id, 'transplant')
          tasks.push({
            id: taskId,
            batchId: batch.id,
            cropPlanId: batch.cropPlanId,
            areaId: batch.areaId,
            plantId: batch.plantId,
            taskType: 'transplant',
            quantity: readyToTransplantCells,
            title: buildTaskTitle('transplant', batch.plantName, readyToTransplantCells, batch.areaName),
            plantName: batch.plantName,
            areaName: batch.areaName,
            targetQuantity: batch.targetQuantity,
            placedCount: batch.placedCount,
            inGardenCount: batch.placedCount,
            remainingCount: batch.remainingCount,
            dueDate: batch.transplantDate,
            batchStartIndoorDate: batch.startIndoorDate,
            batchTransplantDate: batch.transplantDate,
            progressText: `${readyToTransplantCells} tray cells ready to transplant`,
            notes: batch.notes,
            canMarkTransplanted: true,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        if (batch.method === 'transplant' && batch.remainingCount > 0) {
          const taskId = buildTaskId(batch.id, 'transplant')
          tasks.push({
            id: taskId,
            batchId: batch.id,
            cropPlanId: batch.cropPlanId,
            areaId: batch.areaId,
            plantId: batch.plantId,
            taskType: 'transplant',
            quantity: batch.remainingCount,
            title: buildTaskTitle('transplant', batch.plantName, batch.remainingCount, batch.areaName),
            plantName: batch.plantName,
            areaName: batch.areaName,
            targetQuantity: batch.targetQuantity,
            placedCount: batch.placedCount,
            inGardenCount: batch.placedCount,
            remainingCount: batch.remainingCount,
            dueDate: batch.transplantDate,
            batchTransplantDate: batch.transplantDate,
            progressText: `${batch.placedCount}/${batch.targetQuantity} placed`,
            notes: batch.notes,
            canMarkTransplanted: false,
            done: Boolean(state.taskStatusById[taskId]),
          })
        }

        if (batch.method === 'direct_sow' && batch.remainingCount > 0) {
          const taskId = buildTaskId(batch.id, 'direct_sow')
          tasks.push({
            id: taskId,
            batchId: batch.id,
            cropPlanId: batch.cropPlanId,
            areaId: batch.areaId,
            plantId: batch.plantId,
            taskType: 'direct_sow',
            quantity: batch.remainingCount,
            title: buildTaskTitle('direct_sow', batch.plantName, batch.remainingCount, batch.areaName),
            plantName: batch.plantName,
            areaName: batch.areaName,
            targetQuantity: batch.targetQuantity,
            placedCount: batch.placedCount,
            inGardenCount: batch.placedCount,
            remainingCount: batch.remainingCount,
            dueDate: batch.directSowDate,
            batchDirectSowDate: batch.directSowDate,
            progressText: `${batch.placedCount}/${batch.targetQuantity} placed`,
            notes: batch.notes,
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

      if (Boolean(this.taskStatusById[taskId]) === Boolean(done)) {
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

      if (Object.hasOwn(updates, 'usdaZone')) {
        this.usdaZone = typeof updates.usdaZone === 'string' ? updates.usdaZone.trim() : this.usdaZone
      }

      if (Object.hasOwn(updates, 'averageLastFrostDate')) {
        const nextAverageLastFrostDate = normalizeDateString(updates.averageLastFrostDate)
        const shouldSyncLastFrostDate = !this.lastFrostDate || this.lastFrostDate === this.averageLastFrostDate

        this.averageLastFrostDate = nextAverageLastFrostDate

        if (shouldSyncLastFrostDate) {
          this.lastFrostDate = nextAverageLastFrostDate
        }
      }

      if (Object.hasOwn(updates, 'averageFirstFrostDate')) {
        const nextAverageFirstFrostDate = normalizeDateString(updates.averageFirstFrostDate)
        const shouldSyncFirstFrostDate = !this.firstFrostDate || this.firstFrostDate === this.averageFirstFrostDate

        this.averageFirstFrostDate = nextAverageFirstFrostDate

        if (shouldSyncFirstFrostDate) {
          this.firstFrostDate = nextAverageFirstFrostDate
        }
      }
    },

    updateLocationDetails(updates = {}) {
      const nextLocationName = Object.hasOwn(updates, 'locationName')
        ? (typeof updates.locationName === 'string' ? updates.locationName : this.locationName)
        : this.locationName
      const nextStateCode = Object.hasOwn(updates, 'stateCode')
        ? (typeof updates.stateCode === 'string' ? updates.stateCode : this.stateCode)
        : this.stateCode

      this.locationName = nextLocationName
      this.stateCode = nextStateCode
      this.locationDisplayName = Object.hasOwn(updates, 'locationDisplayName')
        ? (typeof updates.locationDisplayName === 'string'
          ? updates.locationDisplayName
          : normalizeLocationDisplayName(nextLocationName, nextStateCode))
        : normalizeLocationDisplayName(nextLocationName, nextStateCode)

      if (Object.hasOwn(updates, 'latitude')) {
        this.latitude = Number.isFinite(Number(updates.latitude)) ? Number(updates.latitude) : null
      }

      if (Object.hasOwn(updates, 'longitude')) {
        this.longitude = Number.isFinite(Number(updates.longitude)) ? Number(updates.longitude) : null
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

        this.updateLocationDetails({
          locationName: place['place name'] ?? '',
          stateCode: place['state abbreviation'] ?? place.state ?? '',
          latitude: place.latitude,
          longitude: place.longitude,
        })
        await Promise.allSettled([
          this.refreshWeather(),
          this.lookupGrowingZone(),
        ])
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
        const previousSuggestedLastFrostDate = this.suggestedFrostDates?.lastFrostDate ?? ''
        const previousSuggestedFirstFrostDate = this.suggestedFrostDates?.firstFrostDate ?? ''
        this.suggestedFrostDates = await suggestFrostDates({
          zipCode: this.zipCode.trim(),
          locationName: this.locationName,
          stateCode: this.stateCode,
          latitude: this.latitude,
          longitude: this.longitude,
        })
        const nextAverageLastFrostDate = normalizeDateString(this.suggestedFrostDates.lastFrostDate)
        const nextAverageFirstFrostDate = normalizeDateString(this.suggestedFrostDates.firstFrostDate)
        const shouldApplyAverageLastFrostDate = !this.averageLastFrostDate
          || this.averageLastFrostDate === previousSuggestedLastFrostDate
        const shouldApplyAverageFirstFrostDate = !this.averageFirstFrostDate
          || this.averageFirstFrostDate === previousSuggestedFirstFrostDate

        if (shouldApplyAverageLastFrostDate) {
          this.averageLastFrostDate = nextAverageLastFrostDate
        }

        if (shouldApplyAverageFirstFrostDate) {
          this.averageFirstFrostDate = nextAverageFirstFrostDate
        }

        if (!this.lastFrostDate) {
          this.lastFrostDate = nextAverageLastFrostDate
        }

        if (!this.firstFrostDate) {
          this.firstFrostDate = nextAverageFirstFrostDate
        }
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

    async lookupGrowingZone() {
      if (!this.zipCode.trim()) {
        this.growingZoneError = 'Enter a ZIP code before requesting a growing zone lookup.'
        return false
      }

      this.growingZonePending = true
      this.growingZoneError = ''

      try {
        const previousSuggestedZone = this.growingZoneSuggestion?.zone ?? ''
        const suggestion = await suggestGrowingZone({
          zipCode: this.zipCode.trim(),
          locationName: this.locationName,
          latitude: this.latitude,
          longitude: this.longitude,
        })

        this.growingZoneSuggestion = normalizeGrowingZoneSuggestion(suggestion)

        if (suggestion.zone && (!this.usdaZone || this.usdaZone === previousSuggestedZone)) {
          this.usdaZone = suggestion.zone
        }

        if (!suggestion.zone) {
          this.growingZoneError = suggestion.notes || 'Zone lookup unavailable right now.'
          return false
        }

        return true
      } catch {
        this.growingZoneError = 'Unable to look up the growing zone right now.'
        return false
      } finally {
        this.growingZonePending = false
      }
    },

    async refreshWeather() {
      if (!this.zipCode.trim() && (this.latitude === null || this.longitude === null)) {
        this.weatherError = 'Set a location before refreshing weather.'
        return false
      }

      this.weatherPending = true
      this.weatherError = ''

      try {
        const weather = await getWeatherSnapshot({
          zipCode: this.zipCode.trim(),
          latitude: this.latitude,
          longitude: this.longitude,
          locationName: this.locationName,
          stateCode: this.stateCode,
        })

        this.updateLocationDetails({
          locationName: weather.locationName || this.locationName,
          stateCode: weather.stateCode || this.stateCode,
          latitude: weather.latitude,
          longitude: weather.longitude,
        })

        this.currentConditions = normalizeCurrentConditions(weather.currentConditions)
        this.dailyForecast = Array.isArray(weather.dailyForecast)
          ? weather.dailyForecast.map(normalizeForecastEntry).filter(Boolean)
          : []
        this.hourlyForecast = Array.isArray(weather.hourlyForecast)
          ? weather.hourlyForecast.map(normalizeForecastEntry).filter(Boolean)
          : []
        this.activeAlerts = Array.isArray(weather.activeAlerts)
          ? weather.activeAlerts.map(normalizeAlert).filter(Boolean)
          : []
        this.lastUpdatedAt = typeof weather.lastUpdatedAt === 'string' ? weather.lastUpdatedAt : ''
        return true
      } catch (error) {
        console.error('[weather-debug] refreshWeather failed', {
          message: error.message,
          zipCode: this.zipCode,
          latitude: this.latitude,
          longitude: this.longitude,
        })
        this.weatherError = typeof error?.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'Unable to load weather data right now.'
        return false
      } finally {
        this.weatherPending = false
      }
    },

    hasWeatherLocation() {
      return Boolean(this.zipCode.trim() || (this.latitude !== null && this.longitude !== null))
    },

    isWeatherStale(staleAfterMs = WEATHER_STALE_AFTER_MS) {
      if (!this.hasWeatherLocation()) {
        return false
      }

      if (!this.currentConditions || !this.lastUpdatedAt) {
        return true
      }

      const updatedAtMs = new Date(this.lastUpdatedAt).getTime()

      if (!Number.isFinite(updatedAtMs)) {
        return true
      }

      return (Date.now() - updatedAtMs) >= staleAfterMs
    },

    async refreshWeatherIfStale(options = {}) {
      const staleAfterMs = Number.isFinite(Number(options.staleAfterMs))
        ? Number(options.staleAfterMs)
        : WEATHER_STALE_AFTER_MS
      const force = Boolean(options.force)

      if (this.weatherPending || !this.hasWeatherLocation()) {
        return false
      }

      if (!force && !this.isWeatherStale(staleAfterMs)) {
        return false
      }

      return this.refreshWeather()
    },

    pruneTaskStatus(validTaskIds) {
      const validIds = new Set(validTaskIds)
      const nextTaskStatusById = Object.fromEntries(
        Object.entries(this.taskStatusById).filter(([taskId]) => validIds.has(taskId)),
      )

      const currentKeys = Object.keys(this.taskStatusById)
      const nextKeys = Object.keys(nextTaskStatusById)

      if (
        currentKeys.length === nextKeys.length
        && currentKeys.every((taskId) => this.taskStatusById[taskId] === nextTaskStatusById[taskId])
      ) {
        return
      }

      this.taskStatusById = nextTaskStatusById
    },
  },
})
