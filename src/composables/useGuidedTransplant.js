import { ref } from 'vue'

export function useGuidedTransplant({ planningStore, propagationStore }) {
  const guidedTransplantRequest = ref(null)

  function startGuidedTransplant(assignment) {
    if (!assignment?.areaId || !assignment?.plantId || !assignment?.batchId) {
      return null
    }

    const initialCurrentCount = planningStore
      .getCurrentPlantingsByAreaId(assignment.areaId)
      .filter((planting) => planting.plantId === assignment.plantId)
      .length

    guidedTransplantRequest.value = {
      key: `${assignment.batchId}:${assignment.id}:${Date.now()}`,
      assignmentId: assignment.id,
      batchId: assignment.batchId,
      cropPlanId: assignment.cropPlanId,
      areaId: assignment.areaId,
      plantId: assignment.plantId,
      quantity: assignment.cellCount,
      initialCurrentCount,
    }

    return guidedTransplantRequest.value
  }

  function finishGuidedTransplant(payload) {
    if (!payload?.assignmentId) {
      return
    }

    propagationStore.updateAssignmentStatus(payload.assignmentId, 'transplanted')
    guidedTransplantRequest.value = null
  }

  function cancelGuidedTransplant() {
    guidedTransplantRequest.value = null
  }

  return {
    guidedTransplantRequest,
    startGuidedTransplant,
    finishGuidedTransplant,
    cancelGuidedTransplant,
  }
}
