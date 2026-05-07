import { defineStore } from 'pinia'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlanningStore } from 'src/stores/planning-store'
import { usePlantStore } from 'src/stores/plant-store'
import { buildPlantingBatch, buildPlantingBatchId } from 'src/utils/planting-batches'

const STORAGE_KEY = 'gardening-app:propagation'
export const TRAY_STATUS_OPTIONS = [
  { label: 'Planned', value: 'planned' },
  { label: 'Active', value: 'active' },
  { label: 'Complete', value: 'complete' },
]
export const ASSIGNMENT_STATUS_OPTIONS = [
  { label: 'Planned', value: 'planned' },
  { label: 'Sown', value: 'sown' },
  { label: 'Germinated', value: 'germinated' },
  { label: 'Ready to Transplant', value: 'ready_to_transplant' },
  { label: 'Transplanted', value: 'transplanted' },
]

function normalizeTrayStatus(status) {
  return TRAY_STATUS_OPTIONS.some((option) => option.value === status) ? status : 'planned'
}

function normalizeAssignmentStatus(status) {
  return ASSIGNMENT_STATUS_OPTIONS.some((option) => option.value === status) ? status : 'planned'
}

function compareDateStrings(a, b) {
  if (a === b) {
    return 0
  }

  if (!a) {
    return 1
  }

  if (!b) {
    return -1
  }

  return a.localeCompare(b)
}

function getDateDifferenceInDays(a, b) {
  if (!a || !b) {
    return Number.POSITIVE_INFINITY
  }

  const dateA = new Date(`${a}T00:00:00`)
  const dateB = new Date(`${b}T00:00:00`)
  return Math.abs(Math.round((dateA - dateB) / (1000 * 60 * 60 * 24)))
}

function createDefaultState() {
  return {
    trays: [],
    trayAssignments: [],
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function buildPersistedSnapshot(state) {
  return {
    version: 1,
    state: {
      trays: state.trays,
      trayAssignments: state.trayAssignments,
    },
  }
}

function normalizeAssignmentBatchId(assignment) {
  if (typeof assignment?.batchId === 'string' && assignment.batchId) {
    return assignment.batchId
  }

  if (typeof assignment?.cropPlanId === 'string' && assignment.cropPlanId) {
    return buildPlantingBatchId(assignment.cropPlanId)
  }

  return ''
}

function hydrateState(snapshot) {
  const defaults = createDefaultState()
  const source = snapshot?.state

  if (!source || typeof source !== 'object') {
    return defaults
  }

  return {
    ...defaults,
    trays: Array.isArray(source.trays)
      ? source.trays.map((tray, index) => ({
        id: tray.id ?? `tray-${index}`,
        name: typeof tray.name === 'string' ? tray.name : `Tray ${index + 1}`,
        cellCount: Math.max(1, Math.round(Number(tray.cellCount) || 72)),
        status: normalizeTrayStatus(tray.status),
      }))
      : [],
    trayAssignments: Array.isArray(source.trayAssignments)
      ? source.trayAssignments
        .filter((assignment) => assignment && typeof assignment.trayId === 'string' && normalizeAssignmentBatchId(assignment))
        .map((assignment, index) => ({
          id: assignment.id ?? `tray-assignment-${index}`,
          trayId: assignment.trayId,
          batchId: normalizeAssignmentBatchId(assignment),
          cellCount: Math.max(1, Math.round(Number(assignment.cellCount) || 1)),
          status: normalizeAssignmentStatus(assignment.status),
        }))
      : [],
  }
}

export const usePropagationStore = defineStore('propagation', {
  state: createDefaultState,

  getters: {
    trayOptions: (state) => state.trays.map((tray) => ({
      label: `${tray.name} · ${tray.cellCount} cells`,
      value: tray.id,
    })),

    traySummaries(state) {
      const planningStore = usePlanningStore()
      const gardenStore = useGardenStore()
      const plantStore = usePlantStore()

      return state.trays.map((tray) => {
        const assignments = state.trayAssignments
          .filter((assignment) => assignment.trayId === tray.id)
          .map((assignment) => {
            const cropPlanId = assignment.batchId.startsWith('batch:')
              ? assignment.batchId.slice('batch:'.length)
              : ''
            const cropPlan = planningStore.cropPlans.find((plan) => plan.id === cropPlanId)
            const area = gardenStore.beds.find((bed) => bed.id === cropPlan?.areaId)
            const plant = plantStore.getPlantById(cropPlan?.plantId)
            const placedCount = cropPlan
              ? planningStore.getPlantingsByAreaId(cropPlan.areaId)
                .filter((planting) => planting.plantId === cropPlan.plantId)
                .length
              : 0
            const batch = cropPlan && area && plant
              ? buildPlantingBatch({ cropPlan, area, plant, placedCount })
              : null

            return {
              ...assignment,
              cropPlanId,
              areaId: cropPlan?.areaId ?? '',
              plantId: cropPlan?.plantId ?? '',
              plantName: plant?.name ?? cropPlan?.plantId ?? 'Unknown',
              areaName: area?.name ?? cropPlan?.areaId ?? 'Unknown Area',
              transplantDate: batch?.transplantDate ?? '',
              startIndoorDate: batch?.startIndoorDate ?? '',
              statusLabel: ASSIGNMENT_STATUS_OPTIONS.find((option) => option.value === assignment.status)?.label ?? 'Planned',
            }
          })

        const usedCells = assignments.reduce((sum, assignment) => sum + assignment.cellCount, 0)
        const transplantDates = assignments
          .map((assignment) => assignment.transplantDate)
          .filter(Boolean)
          .sort(compareDateStrings)

        return {
          ...tray,
          statusLabel: TRAY_STATUS_OPTIONS.find((option) => option.value === tray.status)?.label ?? 'Planned',
          usedCells,
          openCells: Math.max(tray.cellCount - usedCells, 0),
          assignments,
          transplantStartDate: transplantDates[0] ?? '',
          transplantEndDate: transplantDates[transplantDates.length - 1] ?? '',
        }
      })
    },

    indoorStartDemands(state) {
      const planningStore = usePlanningStore()
      const gardenStore = useGardenStore()
      const plantStore = usePlantStore()

      return planningStore.cropPlans
        .filter((cropPlan) => cropPlan.method === 'indoor_start' && cropPlan.targetQuantity > 0)
        .map((cropPlan) => {
          const area = gardenStore.beds.find((bed) => bed.id === cropPlan.areaId)
          const plant = plantStore.getPlantById(cropPlan.plantId)
          const placedCount = planningStore.getPlantingsByAreaId(cropPlan.areaId)
            .filter((planting) => planting.plantId === cropPlan.plantId)
            .length
          const batch = buildPlantingBatch({
            cropPlan,
            area,
            plant,
            placedCount,
          })
          const batchId = batch?.id ?? buildPlantingBatchId(cropPlan)
          const assignedCells = state.trayAssignments
            .filter((assignment) => assignment.batchId === batchId)
            .reduce((sum, assignment) => sum + assignment.cellCount, 0)

          return {
            batchId,
            cropPlanId: cropPlan.id,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            plantName: plant?.name ?? cropPlan.plantId,
            areaName: area?.name ?? cropPlan.areaId,
            targetQuantity: cropPlan.targetQuantity,
            assignedCells,
            remainingCells: Math.max(cropPlan.targetQuantity - assignedCells, 0),
            notes: cropPlan.notes,
            startIndoorDate: batch?.startIndoorDate ?? '',
            transplantDate: batch?.transplantDate ?? '',
          }
        })
        .map((demand) => {
          const recommendedTray = this.traySummaries
            .filter((tray) => tray.status !== 'complete' && tray.openCells >= demand.remainingCells)
            .map((tray) => {
              const transplantDelta = getDateDifferenceInDays(demand.transplantDate, tray.transplantStartDate || tray.transplantEndDate)
              const hasAssignments = tray.assignments.length > 0
              const score = (
                (Number.isFinite(transplantDelta) ? transplantDelta : 3650) * 1000
                + (hasAssignments ? 0 : 200)
                + tray.openCells
              )

              let reason = `Fits ${demand.remainingCells} cells`
              if (hasAssignments && Number.isFinite(transplantDelta)) {
                reason = transplantDelta === 0
                  ? 'Matches an existing transplant window exactly'
                  : `Closest existing transplant window, ${transplantDelta} day${transplantDelta === 1 ? '' : 's'} apart`
              } else if (!hasAssignments) {
                reason = 'Empty tray with enough open cells'
              }

              return {
                trayId: tray.id,
                trayName: tray.name,
                score,
                reason,
              }
            })
            .sort((a, b) => a.score - b.score || a.trayName.localeCompare(b.trayName))[0] ?? null

          return {
            ...demand,
            recommendedTrayId: recommendedTray?.trayId ?? '',
            recommendedTrayName: recommendedTray?.trayName ?? '',
            recommendationReason: recommendedTray?.reason ?? '',
          }
        })
        .filter((demand) => demand.remainingCells > 0)
        .sort((a, b) => (
          a.transplantDate.localeCompare(b.transplantDate)
          || b.remainingCells - a.remainingCells
          || a.areaName.localeCompare(b.areaName)
        ))
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

    createTray(cellCount = 72) {
      const normalizedCellCount = Math.max(1, Math.round(Number(cellCount) || 72))
      const nextSequence = this.trays.length + 1
      const tray = {
        id: `tray-${Date.now()}-${nextSequence}`,
        name: `${normalizedCellCount}-Cell Tray ${nextSequence}`,
        cellCount: normalizedCellCount,
        status: 'planned',
      }

      this.trays = [...this.trays, tray]
      return tray
    },

    assignBatchToTray(batchId, trayId, cellCount) {
      const normalizedBatchId = typeof batchId === 'string' ? batchId : ''
      const normalizedTrayId = typeof trayId === 'string' ? trayId : ''
      const normalizedCellCount = Math.max(1, Math.round(Number(cellCount) || 0))

      if (!normalizedBatchId || !normalizedTrayId || !normalizedCellCount) {
        return
      }

      const existingAssignment = this.trayAssignments.find((assignment) => (
        assignment.batchId === normalizedBatchId && assignment.trayId === normalizedTrayId
      ))

      if (existingAssignment) {
        this.trayAssignments = this.trayAssignments.map((assignment) => (
          assignment.id === existingAssignment.id
            ? { ...assignment, cellCount: assignment.cellCount + normalizedCellCount }
            : assignment
        ))
        return
      }

      this.trayAssignments = [
        ...this.trayAssignments,
        {
          id: `tray-assignment-${Date.now()}-${this.trayAssignments.length + 1}`,
          trayId: normalizedTrayId,
          batchId: normalizedBatchId,
          cellCount: normalizedCellCount,
          status: 'planned',
        },
      ]
    },

    updateTrayStatus(trayId, status) {
      const normalizedTrayId = typeof trayId === 'string' ? trayId : ''

      if (!normalizedTrayId) {
        return
      }

      this.trays = this.trays.map((tray) => (
        tray.id === normalizedTrayId
          ? { ...tray, status: normalizeTrayStatus(status) }
          : tray
      ))
    },

    updateAssignmentStatus(assignmentId, status) {
      this.trayAssignments = this.trayAssignments.map((assignment) => (
        assignment.id === assignmentId
          ? { ...assignment, status: normalizeAssignmentStatus(status) }
          : assignment
      ))
    },

    markReadyAssignmentsTransplanted(batchId) {
      const normalizedBatchId = typeof batchId === 'string' ? batchId : ''

      if (!normalizedBatchId) {
        return
      }

      this.trayAssignments = this.trayAssignments.map((assignment) => (
        assignment.batchId === normalizedBatchId && assignment.status === 'ready_to_transplant'
          ? { ...assignment, status: 'transplanted' }
          : assignment
      ))
    },

    removeAssignment(assignmentId) {
      this.trayAssignments = this.trayAssignments.filter((assignment) => assignment.id !== assignmentId)
    },

    pruneAssignments(validBatchIds) {
      const validIds = new Set(validBatchIds)
      const nextTrayAssignments = this.trayAssignments.filter((assignment) => validIds.has(assignment.batchId))

      if (
        nextTrayAssignments.length === this.trayAssignments.length
        && nextTrayAssignments.every((assignment, index) => assignment.id === this.trayAssignments[index]?.id)
      ) {
        return
      }

      this.trayAssignments = nextTrayAssignments
    },
  },
})
