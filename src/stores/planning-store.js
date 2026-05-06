import { defineStore } from 'pinia'
import { normalizePlantings } from 'src/utils/garden'
import { BUILT_IN_PLANTS } from 'src/utils/garden/plants'

const STORAGE_KEY = 'gardening-app:planning'
const LEGACY_GARDEN_STORAGE_KEY = 'gardening-app:garden'

function createDefaultState() {
  return {
    cropPlans: [],
    plantings: [],
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizePlanningPlantings(plantings = []) {
  if (!Array.isArray(plantings)) {
    return []
  }

  return plantings
    .filter((planting) => planting && typeof planting.areaId === 'string')
    .map((planting, index) => ({
      ...normalizePlantings([planting])[0],
      id: planting.id ?? `planting-${index}-${planting.plantId}`,
      areaId: planting.areaId,
    }))
    .filter(Boolean)
}

function extractLegacyPlantings(snapshot) {
  const beds = snapshot?.state?.beds

  if (!Array.isArray(beds)) {
    return []
  }

  return beds.flatMap((bed) => normalizePlantings(bed?.plantings).map((planting) => ({
    ...planting,
    areaId: bed.id,
  })))
}

function buildPersistedSnapshot(state) {
  return {
    version: 1,
    state: {
      cropPlans: state.cropPlans,
      plantings: state.plantings,
    },
  }
}

const DEFAULT_METHOD_BY_PLANT_ID = BUILT_IN_PLANTS.reduce((methods, plant) => {
  methods[plant.id] = plant.defaultPlanningMethod ?? 'direct_sow'
  return methods
}, {})

function normalizeCropPlans(cropPlans = []) {
  if (!Array.isArray(cropPlans)) {
    return []
  }

  return cropPlans
    .filter((cropPlan) => cropPlan && typeof cropPlan.areaId === 'string' && typeof cropPlan.plantId === 'string')
    .map((cropPlan, index) => ({
      id: cropPlan.id ?? `crop-plan-${index}-${cropPlan.plantId}`,
      areaId: cropPlan.areaId,
      plantId: cropPlan.plantId,
      method: ['direct_sow', 'transplant', 'indoor_start'].includes(cropPlan.method)
        ? cropPlan.method
        : (DEFAULT_METHOD_BY_PLANT_ID[cropPlan.plantId] ?? 'direct_sow'),
      targetQuantity: Math.max(0, Math.round(Number(cropPlan.targetQuantity) || 0)),
      successionIndex: Math.max(0, Math.round(Number(cropPlan.successionIndex) || 0)),
      notes: typeof cropPlan.notes === 'string' ? cropPlan.notes : '',
    }))
}

function buildDefaultCropPlan(areaId, plantId, existingCropPlan = {}) {
  return normalizeCropPlans([{
    id: existingCropPlan.id,
    areaId,
    plantId,
    method: existingCropPlan.method ?? (DEFAULT_METHOD_BY_PLANT_ID[plantId] ?? 'direct_sow'),
    targetQuantity: existingCropPlan.targetQuantity ?? 0,
    successionIndex: existingCropPlan.successionIndex ?? 0,
    notes: existingCropPlan.notes ?? '',
  }])[0]
}

function buildCropPlansFromPlantings(plantings = [], existingCropPlans = []) {
  const groupedCounts = new Map()

  normalizePlanningPlantings(plantings).forEach((planting) => {
    const key = `${planting.areaId}:${planting.plantId}`
    groupedCounts.set(key, (groupedCounts.get(key) ?? 0) + 1)
  })

  const normalizedExistingPlans = normalizeCropPlans(existingCropPlans)

  const plansFromPlantings = [...groupedCounts.entries()].map(([key, count], index) => {
    const [areaId, plantId] = key.split(':')
    const existingPlan = normalizedExistingPlans.find((cropPlan) => (
      cropPlan.areaId === areaId && cropPlan.plantId === plantId
    ))

    return {
      id: existingPlan?.id ?? `crop-plan-${areaId}-${plantId}-${index}`,
      areaId,
      plantId,
      method: existingPlan?.method ?? (DEFAULT_METHOD_BY_PLANT_ID[plantId] ?? 'direct_sow'),
      targetQuantity: count,
      successionIndex: existingPlan?.successionIndex ?? 0,
      notes: existingPlan?.notes ?? '',
    }
  })

  const plansWithoutPlantings = normalizedExistingPlans.filter((cropPlan) => (
    !groupedCounts.has(`${cropPlan.areaId}:${cropPlan.plantId}`)
  ))

  return [...plansFromPlantings, ...plansWithoutPlantings]
}

function hydrateState(snapshot) {
  const defaults = createDefaultState()
  const source = snapshot?.state

  if (!source || typeof source !== 'object') {
    return defaults
  }

  return {
    ...defaults,
    cropPlans: normalizeCropPlans(
      source.cropPlans?.length
        ? source.cropPlans
        : buildCropPlansFromPlantings(source.plantings),
    ),
    plantings: normalizePlanningPlantings(source.plantings),
  }
}

export const usePlanningStore = defineStore('planning', {
  state: createDefaultState,

  getters: {
    getCropPlansByAreaId: (state) => (areaId) => (
      normalizeCropPlans(state.cropPlans.filter((cropPlan) => cropPlan.areaId === areaId))
    ),
    getCropPlanByAreaAndPlantId: (state) => (areaId, plantId) => (
      normalizeCropPlans(
        state.cropPlans.filter((cropPlan) => cropPlan.areaId === areaId && cropPlan.plantId === plantId),
      )[0] ?? null
    ),
    getPlantingsByAreaId: (state) => (areaId) => (
      normalizePlanningPlantings(state.plantings.filter((planting) => planting.areaId === areaId))
    ),
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
        } else {
          const legacySnapshot = window.localStorage.getItem(LEGACY_GARDEN_STORAGE_KEY)

          if (legacySnapshot) {
            this.plantings = extractLegacyPlantings(JSON.parse(legacySnapshot))
            this.cropPlans = buildCropPlansFromPlantings(this.plantings)
          }
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

    setAreaPlantings(areaId, nextPlantings) {
      const normalizedAreaId = typeof areaId === 'string' ? areaId : ''

      if (!normalizedAreaId) {
        return
      }

      const otherPlantings = this.plantings.filter((planting) => planting.areaId !== normalizedAreaId)
      const areaPlantings = normalizePlantings(nextPlantings).map((planting) => ({
        ...planting,
        areaId: normalizedAreaId,
      }))

      this.plantings = [...otherPlantings, ...areaPlantings]
      this.syncAreaCropPlans(normalizedAreaId)
    },

    prunePlantingsForAreaIds(validAreaIds) {
      const validIds = new Set(validAreaIds)
      this.plantings = this.plantings.filter((planting) => validIds.has(planting.areaId))
      this.cropPlans = this.cropPlans.filter((cropPlan) => validIds.has(cropPlan.areaId))
    },

    syncAreaCropPlans(areaId) {
      const normalizedAreaId = typeof areaId === 'string' ? areaId : ''

      if (!normalizedAreaId) {
        return
      }

      const otherCropPlans = this.cropPlans.filter((cropPlan) => cropPlan.areaId !== normalizedAreaId)
      const areaCropPlans = buildCropPlansFromPlantings(
        this.getPlantingsByAreaId(normalizedAreaId),
        this.getCropPlansByAreaId(normalizedAreaId),
      )

      this.cropPlans = [...otherCropPlans, ...areaCropPlans]
    },

    upsertCropPlan(areaId, plantId, updates = {}) {
      const normalizedAreaId = typeof areaId === 'string' ? areaId : ''
      const normalizedPlantId = typeof plantId === 'string' ? plantId : ''

      if (!normalizedAreaId || !normalizedPlantId) {
        return
      }

      const existingPlan = this.getCropPlanByAreaAndPlantId(normalizedAreaId, normalizedPlantId)
      const nextPlan = buildDefaultCropPlan(normalizedAreaId, normalizedPlantId, {
        ...existingPlan,
        ...updates,
      })

      this.cropPlans = [
        ...this.cropPlans.filter((cropPlan) => !(cropPlan.areaId === normalizedAreaId && cropPlan.plantId === normalizedPlantId)),
        nextPlan,
      ]
    },
  },
})
