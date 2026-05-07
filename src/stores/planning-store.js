import { defineStore } from 'pinia'
import { normalizePlantings } from 'src/utils/garden'
import { BUILT_IN_PLANTS } from 'src/utils/garden/plants'

const STORAGE_KEY = 'gardening-app:planning'
const LEGACY_GARDEN_STORAGE_KEY = 'gardening-app:garden'

function createDefaultState() {
  return {
    cropPlans: [],
    plantings: [],
    currentPlantings: [],
    inGardenCountByCropPlanId: {},
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
      currentPlantings: state.currentPlantings,
      inGardenCountByCropPlanId: state.inGardenCountByCropPlanId,
    },
  }
}

function normalizeInGardenCountByCropPlanId(value) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([cropPlanId]) => typeof cropPlanId === 'string' && cropPlanId)
      .map(([cropPlanId, count]) => [cropPlanId, Math.max(0, Math.round(Number(count) || 0))]),
  )
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
    currentPlantings: normalizePlanningPlantings(source.currentPlantings),
    inGardenCountByCropPlanId: normalizeInGardenCountByCropPlanId(source.inGardenCountByCropPlanId),
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
    getCurrentPlantingsByAreaId: (state) => (areaId) => (
      normalizePlanningPlantings(state.currentPlantings.filter((planting) => planting.areaId === areaId))
    ),
    getInGardenCountByCropPlanId: (state) => (cropPlanId) => (
      Math.max(0, Math.round(Number(state.inGardenCountByCropPlanId[cropPlanId]) || 0))
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

    setCurrentAreaPlantings(areaId, nextPlantings) {
      const normalizedAreaId = typeof areaId === 'string' ? areaId : ''

      if (!normalizedAreaId) {
        return
      }

      const otherPlantings = this.currentPlantings.filter((planting) => planting.areaId !== normalizedAreaId)
      const areaPlantings = normalizePlantings(nextPlantings).map((planting) => ({
        ...planting,
        areaId: normalizedAreaId,
      }))

      this.currentPlantings = [...otherPlantings, ...areaPlantings]
      this.syncInGardenCountsForArea(normalizedAreaId)
    },

    prunePlantingsForAreaIds(validAreaIds) {
      const validIds = new Set(validAreaIds)
      this.plantings = this.plantings.filter((planting) => validIds.has(planting.areaId))
      this.currentPlantings = this.currentPlantings.filter((planting) => validIds.has(planting.areaId))
      this.cropPlans = this.cropPlans.filter((cropPlan) => validIds.has(cropPlan.areaId))
      this.pruneInGardenCounts()
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
      this.pruneInGardenCounts()
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
      this.pruneInGardenCounts()
    },

    setInGardenCount(cropPlanId, count) {
      const normalizedCropPlanId = typeof cropPlanId === 'string' ? cropPlanId : ''

      if (!normalizedCropPlanId) {
        return
      }

      const cropPlan = this.cropPlans.find((plan) => plan.id === normalizedCropPlanId)
      const maxCount = Math.max(0, Math.round(Number(cropPlan?.targetQuantity) || 0))
      const normalizedCount = Math.min(Math.max(0, Math.round(Number(count) || 0)), maxCount)

      if (this.getInGardenCountByCropPlanId(normalizedCropPlanId) === normalizedCount) {
        return
      }

      this.inGardenCountByCropPlanId = {
        ...this.inGardenCountByCropPlanId,
        [normalizedCropPlanId]: normalizedCount,
      }
    },

    incrementInGardenCount(cropPlanId, delta = 0) {
      const normalizedCropPlanId = typeof cropPlanId === 'string' ? cropPlanId : ''

      if (!normalizedCropPlanId) {
        return
      }

      this.setInGardenCount(
        normalizedCropPlanId,
        this.getInGardenCountByCropPlanId(normalizedCropPlanId) + Math.max(0, Math.round(Number(delta) || 0)),
      )
    },

    syncInGardenCountsForArea(areaId) {
      const normalizedAreaId = typeof areaId === 'string' ? areaId : ''

      if (!normalizedAreaId) {
        return
      }

      const areaCurrentPlantings = this.getCurrentPlantingsByAreaId(normalizedAreaId)
      const countsByPlantId = areaCurrentPlantings.reduce((counts, planting) => {
        counts[planting.plantId] = (counts[planting.plantId] ?? 0) + 1
        return counts
      }, {})

      this.cropPlans
        .filter((cropPlan) => cropPlan.areaId === normalizedAreaId)
        .forEach((cropPlan) => {
          this.setInGardenCount(cropPlan.id, countsByPlantId[cropPlan.plantId] ?? 0)
        })
    },

    pruneInGardenCounts() {
      const validCropPlanIds = new Set(this.cropPlans.map((cropPlan) => cropPlan.id))
      const nextCounts = Object.fromEntries(
        Object.entries(this.inGardenCountByCropPlanId)
          .filter(([cropPlanId]) => validCropPlanIds.has(cropPlanId))
          .map(([cropPlanId, count]) => {
            const cropPlan = this.cropPlans.find((plan) => plan.id === cropPlanId)
            const maxCount = Math.max(0, Math.round(Number(cropPlan?.targetQuantity) || 0))
            return [cropPlanId, Math.min(Math.max(0, Math.round(Number(count) || 0)), maxCount)]
          }),
      )

      const currentKeys = Object.keys(this.inGardenCountByCropPlanId)
      const nextKeys = Object.keys(nextCounts)

      if (
        currentKeys.length === nextKeys.length
        && currentKeys.every((cropPlanId) => this.inGardenCountByCropPlanId[cropPlanId] === nextCounts[cropPlanId])
      ) {
        return
      }

      this.inGardenCountByCropPlanId = nextCounts
    },
  },
})
