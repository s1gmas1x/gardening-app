import { defineStore } from 'pinia'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlanningStore } from 'src/stores/planning-store'
import { usePlantStore } from 'src/stores/plant-store'

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
        .filter((assignment) => assignment && typeof assignment.trayId === 'string' && typeof assignment.cropPlanId === 'string')
        .map((assignment, index) => ({
          id: assignment.id ?? `tray-assignment-${index}`,
          trayId: assignment.trayId,
          cropPlanId: assignment.cropPlanId,
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

    indoorStartDemands(state) {
      const planningStore = usePlanningStore()
      const gardenStore = useGardenStore()
      const plantStore = usePlantStore()

      return planningStore.cropPlans
        .filter((cropPlan) => cropPlan.method === 'indoor_start' && cropPlan.targetQuantity > 0)
        .map((cropPlan) => {
          const area = gardenStore.beds.find((bed) => bed.id === cropPlan.areaId)
          const plant = plantStore.getPlantById(cropPlan.plantId)
          const assignedCells = state.trayAssignments
            .filter((assignment) => assignment.cropPlanId === cropPlan.id)
            .reduce((sum, assignment) => sum + assignment.cellCount, 0)

          return {
            cropPlanId: cropPlan.id,
            areaId: cropPlan.areaId,
            plantId: cropPlan.plantId,
            plantName: plant?.name ?? cropPlan.plantId,
            areaName: area?.name ?? cropPlan.areaId,
            targetQuantity: cropPlan.targetQuantity,
            assignedCells,
            remainingCells: Math.max(cropPlan.targetQuantity - assignedCells, 0),
            notes: cropPlan.notes,
          }
        })
        .filter((demand) => demand.remainingCells > 0)
        .sort((a, b) => b.remainingCells - a.remainingCells || a.areaName.localeCompare(b.areaName))
    },

    traySummaries(state) {
      const planningStore = usePlanningStore()
      const gardenStore = useGardenStore()
      const plantStore = usePlantStore()

      return state.trays.map((tray) => {
        const assignments = state.trayAssignments
          .filter((assignment) => assignment.trayId === tray.id)
          .map((assignment) => {
            const cropPlan = planningStore.cropPlans.find((plan) => plan.id === assignment.cropPlanId)
            const area = gardenStore.beds.find((bed) => bed.id === cropPlan?.areaId)
            const plant = plantStore.getPlantById(cropPlan?.plantId)

            return {
              ...assignment,
              plantName: plant?.name ?? cropPlan?.plantId ?? 'Unknown',
              areaName: area?.name ?? cropPlan?.areaId ?? 'Unknown Area',
              statusLabel: ASSIGNMENT_STATUS_OPTIONS.find((option) => option.value === assignment.status)?.label ?? 'Planned',
            }
          })

        const usedCells = assignments.reduce((sum, assignment) => sum + assignment.cellCount, 0)

        return {
          ...tray,
          statusLabel: TRAY_STATUS_OPTIONS.find((option) => option.value === tray.status)?.label ?? 'Planned',
          usedCells,
          openCells: Math.max(tray.cellCount - usedCells, 0),
          assignments,
        }
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

    assignCropPlanToTray(cropPlanId, trayId, cellCount) {
      const normalizedCropPlanId = typeof cropPlanId === 'string' ? cropPlanId : ''
      const normalizedTrayId = typeof trayId === 'string' ? trayId : ''
      const normalizedCellCount = Math.max(1, Math.round(Number(cellCount) || 0))

      if (!normalizedCropPlanId || !normalizedTrayId || !normalizedCellCount) {
        return
      }

      const existingAssignment = this.trayAssignments.find((assignment) => (
        assignment.cropPlanId === normalizedCropPlanId && assignment.trayId === normalizedTrayId
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
          cropPlanId: normalizedCropPlanId,
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

    markReadyAssignmentsTransplanted(cropPlanId) {
      const normalizedCropPlanId = typeof cropPlanId === 'string' ? cropPlanId : ''

      if (!normalizedCropPlanId) {
        return
      }

      this.trayAssignments = this.trayAssignments.map((assignment) => (
        assignment.cropPlanId === normalizedCropPlanId && assignment.status === 'ready_to_transplant'
          ? { ...assignment, status: 'transplanted' }
          : assignment
      ))
    },

    removeAssignment(assignmentId) {
      this.trayAssignments = this.trayAssignments.filter((assignment) => assignment.id !== assignmentId)
    },

    pruneAssignments(validCropPlanIds) {
      const validIds = new Set(validCropPlanIds)
      const nextTrayAssignments = this.trayAssignments.filter((assignment) => validIds.has(assignment.cropPlanId))

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
