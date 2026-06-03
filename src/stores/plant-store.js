import { defineStore } from 'pinia'
import { getPlantCatalog } from 'src/services/plants'
import {
  buildPlantOption,
  BUILT_IN_PLANT_FAMILIES,
  BUILT_IN_PLANTS,
  getFamilyById,
  getPlantById,
} from 'src/utils/garden/plants'

function mergeById(builtInRecords, customRecords) {
  const merged = new Map()

  builtInRecords.forEach((record) => {
    merged.set(record.id, record)
  })

  customRecords.forEach((record) => {
    if (record?.id) {
      merged.set(record.id, {
        ...(merged.get(record.id) ?? {}),
        ...record,
      })
    }
  })

  return [...merged.values()]
}

const defaultMethodByPlantId = BUILT_IN_PLANTS.reduce((methods, plant) => {
  methods[plant.id] = plant.defaultPlanningMethod ?? 'direct_sow'
  return methods
}, {})

const visualDefaultsByPlantId = BUILT_IN_PLANTS.reduce((visuals, plant) => {
  visuals[plant.id] = {
    color: plant.color,
    shortLabel: plant.shortLabel,
    symbol: plant.symbol,
    edgeClearanceInches: plant.edgeClearanceInches,
  }
  return visuals
}, {})

function deriveDefaultPlanningMethod(plant) {
  if (plant.indoorStartWeeksBeforeLastFrost !== null && plant.indoorStartWeeksBeforeLastFrost !== undefined) {
    return 'indoor_start'
  }

  if (
    plant.transplantWeeksRelativeToLastFrost !== null
    && plant.transplantWeeksRelativeToLastFrost !== undefined
    && (plant.directSowWeeksRelativeToLastFrost === null || plant.directSowWeeksRelativeToLastFrost === undefined)
  ) {
    return 'transplant'
  }

  return 'direct_sow'
}

function normalizeApiPlantFamily(family) {
  if (!family?.id) {
    return null
  }

  return {
    id: family.id,
    commonName: family.common_name,
    scientificName: family.scientific_name,
    notes: family.notes ?? '',
  }
}

function normalizeApiPlant(plant, familyById) {
  if (!plant?.id) {
    return null
  }

  const family = familyById[plant.family_id] ?? null
  const visuals = visualDefaultsByPlantId[plant.id] ?? {}
  const commonName = plant.common_name ?? plant.name ?? plant.id
  const cropCategory = plant.crop_category ?? 'Uncategorized'
  const indoorStartWeeksBeforeLastFrost = plant.indoor_start_weeks_before_last_frost ?? null
  const directSowWeeksRelativeToLastFrost = plant.direct_sow_weeks_relative_to_last_frost ?? null
  const transplantWeeksRelativeToLastFrost = plant.transplant_weeks_relative_to_last_frost ?? null

  return {
    id: plant.id,
    commonName,
    name: commonName,
    scientificName: plant.scientific_name ?? '',
    familyId: plant.family_id ?? '',
    familyCommonName: family?.commonName ?? '',
    familyScientificName: family?.scientificName ?? '',
    cropCategory,
    lifecycle: plant.lifecycle ?? '',
    frostSensitivity: plant.frost_sensitivity ?? '',
    heatSensitivity: plant.heat_sensitivity ?? '',
    supportNeeds: plant.support_needs ?? '',
    spacingInches: Number(plant.spacing_inches) || 0,
    rowSpacingInches: Number(plant.row_spacing_inches) || 0,
    daysToMaturityMin: Number(plant.days_to_maturity_min) || null,
    daysToMaturityMax: Number(plant.days_to_maturity_max) || null,
    indoorStartWeeksBeforeLastFrost,
    directSowWeeksRelativeToLastFrost,
    transplantWeeksRelativeToLastFrost,
    transplantMinNightTempF: Number(plant.transplant_min_night_temp_f) || null,
    notes: plant.notes ?? '',
    sowBeforeLastFrostWeeks: indoorStartWeeksBeforeLastFrost,
    directSowAfterLastFrostWeeks: directSowWeeksRelativeToLastFrost,
    transplantAfterLastFrostWeeks: transplantWeeksRelativeToLastFrost,
    defaultPlanningMethod: defaultMethodByPlantId[plant.id] ?? deriveDefaultPlanningMethod({
      indoorStartWeeksBeforeLastFrost,
      directSowWeeksRelativeToLastFrost,
      transplantWeeksRelativeToLastFrost,
    }),
    edgeClearanceInches: visuals.edgeClearanceInches ?? Math.max(1, Math.round((Number(plant.spacing_inches) || 0) / 4)),
    color: visuals.color ?? '#6f8f68',
    shortLabel: visuals.shortLabel ?? commonName.slice(0, 2),
    symbol: visuals.symbol ?? 'ring',
  }
}

function createDefaultState() {
  return {
    builtInPlantFamilies: BUILT_IN_PLANT_FAMILIES,
    customPlantFamilies: [],
    builtInPlants: BUILT_IN_PLANTS,
    customPlants: [],
    catalogLoaded: false,
  }
}

export const usePlantStore = defineStore('plants', {
  state: createDefaultState,

  getters: {
    plantFamilyLibrary(state) {
      return mergeById(state.builtInPlantFamilies, state.customPlantFamilies)
    },

    plantLibrary(state) {
      return mergeById(state.builtInPlants, state.customPlants)
    },

    plantsByFamily() {
      return this.plantLibrary.reduce((groups, plant) => {
        const familyId = plant.familyId ?? 'unknown'
        groups[familyId] = [...(groups[familyId] ?? []), plant]
        return groups
      }, {})
    },

    plantsByCategory() {
      return this.plantLibrary.reduce((groups, plant) => {
        const cropCategory = plant.cropCategory ?? 'Uncategorized'
        groups[cropCategory] = [...(groups[cropCategory] ?? []), plant]
        return groups
      }, {})
    },

    plantOptions() {
      return [...this.plantLibrary]
        .sort((a, b) => (
          (this.getFamilyById(a.familyId)?.commonName ?? '').localeCompare(this.getFamilyById(b.familyId)?.commonName ?? '')
          || a.commonName.localeCompare(b.commonName)
        ))
        .map((plant) => buildPlantOption(plant, this.getFamilyById(plant.familyId)))
    },

    defaultPlantId() {
      return this.plantLibrary[0]?.id ?? ''
    },

    getPlantById() {
      return (plantId) => getPlantById(this.plantLibrary, plantId)
    },

    getFamilyById() {
      return (familyId) => getFamilyById(this.plantFamilyLibrary, familyId)
    },

    rotationWarningFamilyIds() {
      return (plantId) => {
        const plant = this.getPlantById(plantId)
        return plant?.familyId ? [plant.familyId] : []
      }
    },

    compatiblePlants() {
      return () => []
    },
  },

  actions: {
    async initializeCatalog() {
      if (this._catalogInitializationPromise) {
        return this._catalogInitializationPromise
      }

      this._catalogInitializationPromise = (async () => {
        try {
          const payload = await getPlantCatalog()
          const families = Array.isArray(payload?.families)
            ? payload.families.map(normalizeApiPlantFamily).filter(Boolean)
            : []
          const familyById = families.reduce((groups, family) => {
            groups[family.id] = family
            return groups
          }, {})
          const plants = Array.isArray(payload?.plants)
            ? payload.plants.map((plant) => normalizeApiPlant(plant, familyById)).filter(Boolean)
            : []

          if (families.length) {
            this.builtInPlantFamilies = families
          }

          if (plants.length) {
            this.builtInPlants = plants
          }

          this.catalogLoaded = true
        } catch {
          this.catalogLoaded = true
        }
      })()

      return this._catalogInitializationPromise
    },
  },
})
