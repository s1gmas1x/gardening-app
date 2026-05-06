export const BUILT_IN_PLANTS = [
  {
    id: 'tomato',
    name: 'Tomato',
    defaultPlanningMethod: 'transplant',
    sowBeforeLastFrostWeeks: 6,
    transplantAfterLastFrostWeeks: 1,
    spacingInches: 24,
    edgeClearanceInches: 6,
    color: '#d94b3d',
    shortLabel: 'Tm',
    symbol: 'ring',
  },
  {
    id: 'pepper',
    name: 'Pepper',
    defaultPlanningMethod: 'transplant',
    sowBeforeLastFrostWeeks: 8,
    transplantAfterLastFrostWeeks: 1,
    spacingInches: 18,
    edgeClearanceInches: 6,
    color: '#f08a24',
    shortLabel: 'Pp',
    symbol: 'diamond',
  },
  {
    id: 'lettuce',
    name: 'Lettuce',
    defaultPlanningMethod: 'direct_sow',
    sowBeforeLastFrostWeeks: 4,
    transplantAfterLastFrostWeeks: -2,
    directSowAfterLastFrostWeeks: -2,
    spacingInches: 8,
    edgeClearanceInches: 4,
    color: '#7fbe5e',
    shortLabel: 'Lt',
    symbol: 'leaf',
  },
  {
    id: 'carrot',
    name: 'Carrot',
    defaultPlanningMethod: 'direct_sow',
    directSowAfterLastFrostWeeks: -2,
    spacingInches: 3,
    edgeClearanceInches: 1,
    color: '#ff9f43',
    shortLabel: 'Cr',
    symbol: 'root',
  },
  {
    id: 'basil',
    name: 'Basil',
    defaultPlanningMethod: 'transplant',
    sowBeforeLastFrostWeeks: 4,
    transplantAfterLastFrostWeeks: 1,
    spacingInches: 12,
    edgeClearanceInches: 4,
    color: '#4e9f63',
    shortLabel: 'Bs',
    symbol: 'clover',
  },
  {
    id: 'marigold',
    name: 'Marigold',
    defaultPlanningMethod: 'transplant',
    sowBeforeLastFrostWeeks: 4,
    transplantAfterLastFrostWeeks: 1,
    spacingInches: 10,
    edgeClearanceInches: 4,
    color: '#f2b824',
    shortLabel: 'Mg',
    symbol: 'sun',
  },
]

export function getPlantById(plantLibrary, plantId) {
  return plantLibrary.find((plant) => plant.id === plantId) ?? null
}

export function buildPlantOption(plant) {
  return {
    label: `${plant.name} · ${plant.spacingInches}"`,
    value: plant.id,
  }
}
