export function addDays(dateString, days) {
  if (!dateString) {
    return ''
  }

  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function buildPlantingBatchId(cropPlanOrId) {
  const cropPlanId = typeof cropPlanOrId === 'string' ? cropPlanOrId : cropPlanOrId?.id
  return cropPlanId ? `batch:${cropPlanId}` : ''
}

export function buildPlantingBatch({
  cropPlan,
  area,
  plant,
  placedCount = 0,
  lastFrostDate = '',
  firstFrostDate = '',
}) {
  if (!cropPlan || !area || !plant || cropPlan.targetQuantity <= 0) {
    return null
  }

  const remainingCount = Math.max(cropPlan.targetQuantity - placedCount, 0)

  return {
    id: buildPlantingBatchId(cropPlan),
    cropPlanId: cropPlan.id,
    areaId: cropPlan.areaId,
    areaName: area.name,
    plantId: cropPlan.plantId,
    plantName: plant.name,
    method: cropPlan.method,
    targetQuantity: cropPlan.targetQuantity,
    placedCount,
    remainingCount,
    successionIndex: cropPlan.successionIndex,
    notes: cropPlan.notes,
    lastFrostDate,
    firstFrostDate,
    startIndoorDate: cropPlan.method === 'indoor_start'
      ? addDays(lastFrostDate, -7 * (plant.sowBeforeLastFrostWeeks ?? 0))
      : '',
    transplantDate: ['indoor_start', 'transplant'].includes(cropPlan.method)
      ? addDays(lastFrostDate, 7 * (plant.transplantAfterLastFrostWeeks ?? 0))
      : '',
    directSowDate: cropPlan.method === 'direct_sow'
      ? addDays(lastFrostDate, 7 * (plant.directSowAfterLastFrostWeeks ?? 0))
      : '',
  }
}
