import { BUILT_IN_PLANTS, getPlantById as getPlantDefinitionById } from './garden/plants'

export const BASE_PIXELS_PER_FOOT = 48
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 4
export const DEFAULT_ZOOM = 1
export const ZOOM_STEP = 0.25
export const GRID_PADDING = 48
export const BED_SNAP_FEET = 0.5
export const MIN_BED_SIZE_FEET = 1
export const BED_TYPE_OPTIONS = [
  { label: 'Regular Bed', value: 'regular' },
  { label: 'Raised Bed', value: 'raised' },
  { label: 'Pot', value: 'pot' },
]
export const PLANT_LIBRARY = BUILT_IN_PLANTS

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function snapToIncrement(value, increment = BED_SNAP_FEET) {
  return Math.round(value / increment) * increment
}

export function normalizeBedType(type) {
  return BED_TYPE_OPTIONS.some((option) => option.value === type) ? type : 'regular'
}

export function getPlantById(plantId) {
  return getPlantDefinitionById(PLANT_LIBRARY, plantId)
}

export function spacingInchesToFeet(spacingInches) {
  return Number(spacingInches) / 12
}

export function clearanceInchesToFeet(clearanceInches) {
  return Number(clearanceInches) / 12
}

export function normalizePlantings(plantings = []) {
  if (!Array.isArray(plantings)) {
    return []
  }

  return plantings
    .filter((planting) => planting && getPlantById(planting.plantId))
    .map((planting, index) => ({
      id: planting.id ?? `planting-${index}-${planting.plantId}`,
      plantId: planting.plantId,
      xFeet: Number(planting.xFeet) || 0,
      yFeet: Number(planting.yFeet) || 0,
    }))
}

export function summarizePlantings(plantings = []) {
  const counts = new Map()

  normalizePlantings(plantings).forEach((planting) => {
    counts.set(planting.plantId, (counts.get(planting.plantId) ?? 0) + 1)
  })

  return [...counts.entries()]
    .map(([plantId, count]) => ({
      plant: getPlantById(plantId),
      count,
    }))
    .filter((entry) => entry.plant)
    .sort((a, b) => b.count - a.count || a.plant.name.localeCompare(b.plant.name))
}

export function bedSupportsHeight(type) {
  const normalizedType = normalizeBedType(type)
  return normalizedType === 'raised' || normalizedType === 'pot'
}

export function normalizeBedHeightInches(heightInches, type) {
  if (!bedSupportsHeight(type)) {
    return 0
  }

  return clamp(Number(heightInches) || 0, 1, 96)
}

export function getBedTypeMeta(type) {
  const normalizedType = normalizeBedType(type)

  if (normalizedType === 'raised') {
    return {
      label: 'Raised Bed',
      defaultHeightInches: 18,
      fill: '#8c5a3c',
      stroke: '#402718',
      grid: '#fff4e5',
    }
  }

  if (normalizedType === 'pot') {
    return {
      label: 'Pot',
      defaultHeightInches: 16,
      fill: '#c9733d',
      stroke: '#6a3415',
      grid: '#ffe9d6',
    }
  }

  return {
    label: 'Regular Bed',
    defaultHeightInches: 0,
    fill: '#a56f49',
    stroke: '#51311d',
    grid: '#fff4e5',
  }
}

export function buildAutoAreaName(type, sequenceNumber) {
  return `${getBedTypeMeta(type).label} ${sequenceNumber}`
}

export function normalizeBedRotation(rotationDegrees) {
  const normalized = Number(rotationDegrees) || 0
  const snapped = Math.round(normalized / 90) * 90
  return ((snapped % 360) + 360) % 360
}

export function getBedFootprint(bed) {
  const rotationDegrees = normalizeBedRotation(bed.rotationDegrees)
  const isQuarterTurn = rotationDegrees === 90 || rotationDegrees === 270

  return {
    widthFeet: isQuarterTurn ? bed.heightFeet : bed.widthFeet,
    heightFeet: isQuarterTurn ? bed.widthFeet : bed.heightFeet,
  }
}

export function isPointInsideArea(area, xFeet, yFeet) {
  const type = normalizeBedType(area.type)
  const widthFeet = Number(area.widthFeet) || 0
  const heightFeet = Number(area.heightFeet) || 0

  if (xFeet < 0 || yFeet < 0 || xFeet > widthFeet || yFeet > heightFeet) {
    return false
  }

  if (type !== 'pot') {
    return true
  }

  const radiusX = widthFeet / 2
  const radiusY = heightFeet / 2

  if (!radiusX || !radiusY) {
    return false
  }

  const normalizedX = (xFeet - radiusX) / radiusX
  const normalizedY = (yFeet - radiusY) / radiusY
  return (normalizedX ** 2) + (normalizedY ** 2) <= 1
}

export function getAreaPlantingPoints(area, plantId) {
  const plant = getPlantById(plantId)

  if (!plant) {
    return []
  }

  const spacingFeet = spacingInchesToFeet(plant.spacingInches)
  const edgeClearanceFeet = clearanceInchesToFeet(plant.edgeClearanceInches ?? plant.spacingInches / 2)
  const widthFeet = Number(area.widthFeet) || 0
  const heightFeet = Number(area.heightFeet) || 0
  const points = []
  const startX = Math.min(edgeClearanceFeet, widthFeet / 2)
  const startY = Math.min(edgeClearanceFeet, heightFeet / 2)
  const endX = Math.max(widthFeet - edgeClearanceFeet, startX)
  const endY = Math.max(heightFeet - edgeClearanceFeet, startY)
  const epsilon = 0.0001

  for (let xFeet = startX; xFeet <= endX + epsilon; xFeet += spacingFeet) {
    for (let yFeet = startY; yFeet <= endY + epsilon; yFeet += spacingFeet) {
      const snappedX = Number(xFeet.toFixed(4))
      const snappedY = Number(yFeet.toFixed(4))

      if (isPointInsideArea(area, snappedX, snappedY)) {
        points.push({
          xFeet: snappedX,
          yFeet: snappedY,
        })
      }
    }
  }

  return points
}

export function feetToPixels(feet) {
  return feet * BASE_PIXELS_PER_FOOT
}

export function pixelsToFeet(pixels) {
  return pixels / BASE_PIXELS_PER_FOOT
}

export function normalizeGardenDimensions(widthFeet, lengthFeet) {
  return {
    widthFeet: clamp(Number(widthFeet) || 0, 1, 500),
    lengthFeet: clamp(Number(lengthFeet) || 0, 1, 500),
  }
}

export function createDefaultBed(index, garden, type = 'regular', sequenceNumber = index + 1) {
  const normalizedType = normalizeBedType(type)
  const widthFeet = Math.min(normalizedType === 'pot' ? 2 : 4, garden.widthFeet)
  const heightFeet = Math.min(normalizedType === 'pot' ? 2 : 8, garden.lengthFeet)
  const offset = index * BED_SNAP_FEET
  const typeMeta = getBedTypeMeta(normalizedType)

  return clampBedToGarden({
    id: `bed-${Date.now()}-${index}`,
    name: buildAutoAreaName(normalizedType, sequenceNumber),
    xFeet: offset,
    yFeet: offset,
    widthFeet,
    heightFeet,
    type: normalizedType,
    bedHeightInches: typeMeta.defaultHeightInches,
    rotationDegrees: 0,
    color: typeMeta.fill,
  }, garden)
}

export function clampBedToGarden(bed, garden) {
  const widthFeet = clamp(Number(bed.widthFeet) || 0, MIN_BED_SIZE_FEET, garden.widthFeet)
  const heightFeet = clamp(Number(bed.heightFeet) || 0, MIN_BED_SIZE_FEET, garden.lengthFeet)
  const type = normalizeBedType(bed.type)
  const bedHeightInches = normalizeBedHeightInches(
    bed.bedHeightInches ?? getBedTypeMeta(type).defaultHeightInches,
    type,
  )
  const rotationDegrees = normalizeBedRotation(bed.rotationDegrees)
  const typeMeta = getBedTypeMeta(type)
  const footprint = getBedFootprint({
    widthFeet,
    heightFeet,
    rotationDegrees,
  })
  const maxX = Math.max(garden.widthFeet - footprint.widthFeet, 0)
  const maxY = Math.max(garden.lengthFeet - footprint.heightFeet, 0)

  return {
    ...bed,
    widthFeet,
    heightFeet,
    type,
    bedHeightInches,
    rotationDegrees,
    color: typeMeta.fill,
    xFeet: clamp(snapToIncrement(Number(bed.xFeet) || 0), 0, maxX),
    yFeet: clamp(snapToIncrement(Number(bed.yFeet) || 0), 0, maxY),
  }
}

export function zoomAroundPoint(viewport, nextZoom, point) {
  const boundedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
  const zoomRatio = boundedZoom / viewport.zoom

  return {
    zoom: boundedZoom,
    panX: point.x - (point.x - viewport.panX) * zoomRatio,
    panY: point.y - (point.y - viewport.panY) * zoomRatio,
  }
}

export function buildGridLines(widthFeet, lengthFeet, includeMinorGrid) {
  const widthPixels = feetToPixels(widthFeet)
  const heightPixels = feetToPixels(lengthFeet)
  const majorLines = []
  const minorLines = []
  const inchStep = 1 / 12

  for (let xFeet = 0; xFeet <= widthFeet; xFeet += 1) {
    const x = feetToPixels(xFeet)
    majorLines.push({ x1: x, y1: 0, x2: x, y2: heightPixels })
  }

  for (let yFeet = 0; yFeet <= lengthFeet; yFeet += 1) {
    const y = feetToPixels(yFeet)
    majorLines.push({ x1: 0, y1: y, x2: widthPixels, y2: y })
  }

  if (includeMinorGrid) {
    for (let xFeet = 0; xFeet <= widthFeet; xFeet += inchStep) {
      if (Math.abs(xFeet - Math.round(xFeet)) < 0.0001) {
        continue
      }

      const x = feetToPixels(xFeet)
      minorLines.push({ x1: x, y1: 0, x2: x, y2: heightPixels })
    }

    for (let yFeet = 0; yFeet <= lengthFeet; yFeet += inchStep) {
      if (Math.abs(yFeet - Math.round(yFeet)) < 0.0001) {
        continue
      }

      const y = feetToPixels(yFeet)
      minorLines.push({ x1: 0, y1: y, x2: widthPixels, y2: y })
    }
  }

  return {
    widthPixels,
    heightPixels,
    majorLines,
    minorLines,
  }
}

export function buildBedGridLines(widthFeet, heightFeet, includeMinorGrid) {
  const widthPixels = feetToPixels(widthFeet)
  const heightPixels = feetToPixels(heightFeet)
  const majorLines = []
  const minorLines = []
  const inchStep = 1 / 12

  for (let xFeet = 1; xFeet < widthFeet; xFeet += 1) {
    const x = feetToPixels(xFeet)
    majorLines.push({ x1: x, y1: 0, x2: x, y2: heightPixels })
  }

  for (let yFeet = 1; yFeet < heightFeet; yFeet += 1) {
    const y = feetToPixels(yFeet)
    majorLines.push({ x1: 0, y1: y, x2: widthPixels, y2: y })
  }

  if (includeMinorGrid) {
    for (let xFeet = inchStep; xFeet < widthFeet; xFeet += inchStep) {
      if (Math.abs(xFeet - Math.round(xFeet)) < 0.0001) {
        continue
      }

      const x = feetToPixels(xFeet)
      minorLines.push({ x1: x, y1: 0, x2: x, y2: heightPixels })
    }

    for (let yFeet = inchStep; yFeet < heightFeet; yFeet += inchStep) {
      if (Math.abs(yFeet - Math.round(yFeet)) < 0.0001) {
        continue
      }

      const y = feetToPixels(yFeet)
      minorLines.push({ x1: 0, y1: y, x2: widthPixels, y2: y })
    }
  }

  return {
    majorLines,
    minorLines,
  }
}
