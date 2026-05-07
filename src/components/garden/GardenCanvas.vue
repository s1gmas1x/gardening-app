<template>
  <div
    ref="viewportRef"
    class="planner-viewport"
    :class="{ 'planner-viewport--panning': interactionMode === 'pan' }"
    :style="{ touchAction: viewportTouchAction }"
    @wheel.prevent="handleWheel"
    @pointerdown="handleViewportPointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointerleave="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <svg class="planner-svg">
      <g :transform="transform">
        <rect
          class="garden-surface"
          x="0"
          y="0"
          :width="grid.widthPixels"
          :height="grid.heightPixels"
          rx="16"
        />

        <line
          v-for="line in grid.minorLines"
          :key="`minor-${line.x1}-${line.y1}-${line.x2}-${line.y2}`"
          class="grid-line grid-line--minor"
          v-bind="line"
        />

        <line
          v-for="line in grid.majorLines"
          :key="`major-${line.x1}-${line.y1}-${line.x2}-${line.y2}`"
          class="grid-line grid-line--major"
          v-bind="line"
        />

        <g
          v-for="bed in beds"
          :key="bed.id"
          class="bed-group"
          :class="[
            `bed-group--${bed.type}`,
            { 'bed-group--selected': selectedBedId === bed.id },
          ]"
          :transform="`translate(${feetToPixels(bed.xFeet)} ${feetToPixels(bed.yFeet)})`"
          @pointerdown.stop="handleBedPointerDown($event, bed.id)"
        >
          <g :transform="getBedRenderTransform(bed)">
            <defs>
              <clipPath :id="getBedClipPathId(bed)">
                <ellipse
                  v-if="bed.type === 'pot'"
                  :cx="feetToPixels(bed.widthFeet) / 2"
                  :cy="feetToPixels(bed.heightFeet) / 2"
                  :rx="feetToPixels(bed.widthFeet) / 2"
                  :ry="feetToPixels(bed.heightFeet) / 2"
                />
                <rect
                  v-else
                  x="0"
                  y="0"
                  :width="feetToPixels(bed.widthFeet)"
                  :height="feetToPixels(bed.heightFeet)"
                  :rx="bed.type === 'raised' ? 10 : 6"
                />
              </clipPath>
            </defs>

            <ellipse
              v-if="bed.type === 'pot'"
              class="bed-shape bed-shape--pot"
              :cx="feetToPixels(bed.widthFeet) / 2"
              :cy="feetToPixels(bed.heightFeet) / 2"
              :rx="feetToPixels(bed.widthFeet) / 2"
              :ry="feetToPixels(bed.heightFeet) / 2"
              :fill="getBedTypeMeta(bed.type).fill"
              :stroke="getBedTypeMeta(bed.type).stroke"
            />
            <rect
              v-else
              class="bed-shape"
              :class="bed.type === 'raised' ? 'bed-shape--raised' : 'bed-shape--regular'"
              :x="0"
              :y="0"
              :width="feetToPixels(bed.widthFeet)"
              :height="feetToPixels(bed.heightFeet)"
              :rx="bed.type === 'raised' ? 10 : 6"
              :fill="getBedTypeMeta(bed.type).fill"
              :stroke="getBedTypeMeta(bed.type).stroke"
            />

            <rect
              v-if="bed.type === 'raised'"
              class="bed-rim"
              :x="8"
              :y="8"
              :width="Math.max(feetToPixels(bed.widthFeet) - 16, 0)"
              :height="Math.max(feetToPixels(bed.heightFeet) - 16, 0)"
              rx="8"
            />

            <g :clip-path="`url(#${getBedClipPathId(bed)})`">
              <line
                v-for="line in getBedGrid(bed).minorLines"
                :key="`bed-minor-grid-${bed.id}-${line.x1}-${line.y1}-${line.x2}-${line.y2}`"
                class="bed-grid-line bed-grid-line--minor"
                :stroke="getBedTypeMeta(bed.type).grid"
                v-bind="line"
              />

              <line
                v-for="line in getBedGrid(bed).majorLines"
                :key="`bed-major-grid-${bed.id}-${line.x1}-${line.y1}-${line.x2}-${line.y2}`"
                class="bed-grid-line bed-grid-line--major"
                :stroke="getBedTypeMeta(bed.type).grid"
                v-bind="line"
              />

              <circle
                v-for="planting in getBedPlantingsBySymbol(bed).sun"
                :key="`${planting.id}-sun-core`"
                class="planting-dot"
                :cx="feetToPixels(planting.xFeet)"
                :cy="feetToPixels(planting.yFeet)"
                :r="getPlantMarkerRadius(planting.plantId) * 0.55"
                :fill="getPlantColor(planting.plantId)"
              />
              <circle
                v-for="planting in getBedPlantingsBySymbol(bed).ring"
                :key="`${planting.id}-ring`"
                class="planting-ring"
                :cx="feetToPixels(planting.xFeet)"
                :cy="feetToPixels(planting.yFeet)"
                :r="getPlantMarkerRadius(planting.plantId)"
                :stroke="getPlantColor(planting.plantId)"
              />
              <rect
                v-for="planting in getBedPlantingsBySymbol(bed).diamond"
                :key="`${planting.id}-diamond`"
                class="planting-shape"
                :x="feetToPixels(planting.xFeet) - getPlantMarkerRadius(planting.plantId)"
                :y="feetToPixels(planting.yFeet) - getPlantMarkerRadius(planting.plantId)"
                :width="getPlantMarkerRadius(planting.plantId) * 2"
                :height="getPlantMarkerRadius(planting.plantId) * 2"
                :fill="getPlantColor(planting.plantId)"
                :transform="`rotate(45 ${feetToPixels(planting.xFeet)} ${feetToPixels(planting.yFeet)})`"
              />
              <path
                v-for="planting in getBedPlantingsBySymbol(bed).leaf"
                :key="`${planting.id}-leaf`"
                class="planting-shape"
                :d="getLeafPath(planting)"
                :fill="getPlantColor(planting.plantId)"
              />
              <path
                v-for="planting in getBedPlantingsBySymbol(bed).root"
                :key="`${planting.id}-root`"
                class="planting-shape"
                :d="getRootPath(planting)"
                :fill="getPlantColor(planting.plantId)"
              />
              <path
                v-for="planting in getBedPlantingsBySymbol(bed).clover"
                :key="`${planting.id}-clover`"
                class="planting-shape"
                :d="getCloverPath(planting)"
                :fill="getPlantColor(planting.plantId)"
              />
              <path
                v-for="planting in getBedPlantingsBySymbol(bed).sun"
                :key="`${planting.id}-sun-rays`"
                class="planting-sun-ray"
                :d="getSunRayPath(planting)"
                :stroke="getPlantColor(planting.plantId)"
              />
            </g>

            <g v-if="getPlantingSummary(bed).length" class="bed-summary">
              <rect
                class="bed-summary__panel"
                :x="getBedSummaryX(bed)"
                :y="getBedSummaryY(bed)"
                :width="getBedSummaryWidth(bed)"
                :height="getBedSummaryHeight(bed)"
                rx="10"
              />
              <g
                v-for="(entry, index) in getPlantingSummary(bed).slice(0, 3)"
                :key="`${bed.id}-summary-${entry.plant.id}`"
                :transform="`translate(${getBedSummaryX(bed) + 10} ${getBedSummaryY(bed) + 16 + (index * 14)})`"
              >
                <circle r="4" :fill="entry.plant.color" />
                <text x="10" y="4" class="bed-summary__text">
                  {{ entry.plant.shortLabel ?? entry.plant.name }} x{{ entry.count }}
                </text>
              </g>
              <text
                v-if="getPlantingSummary(bed).length > 3"
                :x="getBedSummaryX(bed) + 10"
                :y="getBedSummaryY(bed) + getBedSummaryHeight(bed) - 8"
                class="bed-summary__more"
              >
                +{{ getPlantingSummary(bed).length - 3 }} more
              </text>
            </g>

          </g>

          <text
            :x="getBedLabelX(bed)"
            :y="getBedLabelY(bed)"
            class="bed-label bed-label--centered"
          >
            {{ bed.name }}
          </text>
        </g>
      </g>
    </svg>

    <BedEditorCard
      v-if="selectedBed"
      :selected-bed="selectedBed"
      :supports-selected-bed-height="supportsSelectedBedHeight"
      :type-label="getBedTypeMeta(selectedBed.type).label"
      :bed-type-select-options="bedTypeSelectOptions"
      :style-object="selectedBedMenuStyle"
      @update-name="gardenStore.updateBed(selectedBed.id, { name: $event })"
      @update-type="gardenStore.updateBed(selectedBed.id, { type: $event })"
      @update-width="gardenStore.updateBed(selectedBed.id, { widthFeet: $event })"
      @update-length="gardenStore.updateBed(selectedBed.id, { heightFeet: $event })"
      @update-height="gardenStore.updateBed(selectedBed.id, { bedHeightInches: $event })"
      @rotate="rotateSelectedBed"
      @close="gardenStore.clearSelection"
      @delete="gardenStore.removeSelectedBed"
      @plant="openPlantingDialog"
    />

    <PlantingDialog
      :model-value="isPlantingDialogOpen"
      :selected-bed="selectedBed"
      :selected-plant="selectedPlant"
      :selected-plant-id="selectedPlantId"
      :plant-options="plantOptions"
      :selected-crop-plan="selectedPlantCropPlan"
      :selected-crop-plan-placed-count="selectedPlantPlacedCount"
      :selected-crop-plan-remaining-count="selectedPlantRemainingCount"
      :crop-plan-method-options="cropPlanMethodOptions"
      :planting-layout-mode="plantingLayoutMode"
      :planting-mode="plantingMode"
      :free-placement-snap="freePlacementSnap"
      :free-placement-conflict-count="freePlacementConflictCount"
      :free-placement-boundary-count="freePlacementBoundaryCount"
      :planting-summary="selectedBed ? getPlantingSummary(selectedBed) : []"
      :crop-plans="selectedBedCropPlans"
      :workspace-mode="props.workspaceMode"
      :guided-transplant-request="props.guidedTransplantRequest"
      :guided-transplant-placed-count="guidedTransplantPlacedCount"
      :guided-suggested-plantings="guidedSuggestedPlantings"
      :planting-preview-layout="plantingPreviewLayout"
      :planting-points="plantingPoints"
      :hovered-planting-point="hoveredPlantingPoint"
      :preview-plantings="previewPlantings"
      :selected-preview-planting="selectedPreviewPlanting"
      :selected-preview-planting-id="selectedPreviewPlantingId"
      :active-planting-id="freeDragState.plantingId"
      :preview-drag-state="previewDragState"
      :get-bed-type-meta="getBedTypeMeta"
      :get-point-key="getPointKey"
      :feet-to-pixels="feetToPixels"
      :get-preview-point-fill="getPreviewPointFill"
      :get-preview-point-stroke="getPreviewPointStroke"
      :planting-has-conflict="plantingHasConflict"
      :planting-has-boundary-conflict="plantingHasBoundaryConflict"
      :get-plant-spacing-radius-feet="getPlantSpacingRadiusFeet"
      :get-plant-color="getPlantColor"
      :get-plant-short-label="getPlantShortLabel"
      @update:model-value="isPlantingDialogOpen = $event"
      @update:selectedPlantId="selectedPlantId = $event"
      @update:selectedCropPlanMethod="updateSelectedCropPlan({ method: $event })"
      @update:selectedCropPlanTargetQuantity="updateSelectedCropPlan({ targetQuantity: $event })"
      @update:selectedCropPlanNotes="updateSelectedCropPlan({ notes: $event })"
      @place-planned="placePlannedPlantings"
      @update:plantingLayoutMode="plantingLayoutMode = $event"
      @update:plantingMode="plantingMode = $event"
      @update:freePlacementSnap="freePlacementSnap = $event"
      @fill-all="fillAllPlantingPoints"
      @place-guided-suggested="placeGuidedSuggestedPlantings"
      @finish-guided-transplant="finishGuidedTransplant"
      @clear-area="clearSelectedPlantings"
      @delete-selected-plant="deleteSelectedPreviewPlanting"
      @preview-pointerdown="handlePlantingPreviewPointerDown"
      @preview-pointermove="handlePlantingPreviewPointerMove"
      @preview-pointerup="handlePlantingPreviewPointerUp"
      @preview-pointerleave="handlePlantingPreviewPointerLeave"
      @close="closePlantingDialog"
    />

    <div class="planner-hint">
      <span>{{ interactionMode === 'pan' ? 'Drag to pan' : 'Scroll to zoom, drag beds to place them' }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import BedEditorCard from 'src/components/garden/BedEditorCard.vue'
import PlantingDialog from 'src/components/garden/PlantingDialog.vue'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlantStore } from 'src/stores/plant-store'
import { usePlanningStore } from 'src/stores/planning-store'
import {
  bedSupportsHeight,
  buildBedGridLines,
  buildGridLines,
  clamp,
  feetToPixels,
  getAreaPlantingPoints,
  getBedFootprint,
  getBedTypeMeta,
  isPointInsideArea,
  normalizeBedRotation,
  zoomAroundPoint,
  snapToIncrement,
  spacingInchesToFeet,
  summarizePlantings,
  pixelsToFeet,
} from 'src/utils/garden'

const props = defineProps({
  plantingRequest: {
    type: Object,
    default: null,
  },
  guidedTransplantRequest: {
    type: Object,
    default: null,
  },
  workspaceMode: {
    type: String,
    default: 'plan',
  },
})

const emit = defineEmits(['finish-guided-transplant', 'cancel-guided-transplant'])

const gardenStore = useGardenStore()
const plantStore = usePlantStore()
const planningStore = usePlanningStore()
const { beds, gardenDimensions, interactionMode, selectedBed, selectedBedId, viewport } = storeToRefs(gardenStore)
const { defaultPlantId, plantOptions } = storeToRefs(plantStore)

const viewportRef = ref(null)
const bedTypeSelectOptions = [
  { label: 'Regular Bed', value: 'regular' },
  { label: 'Raised Bed', value: 'raised' },
  { label: 'Pot', value: 'pot' },
]
const viewportSize = reactive({
  width: 0,
  height: 0,
})
const pointerState = reactive({
  mode: null,
  pointerId: null,
  bedId: null,
  startClientX: 0,
  startClientY: 0,
  startPanX: 0,
  startPanY: 0,
  startBedXFeet: 0,
  startBedYFeet: 0,
})
const touchPoints = reactive({})
const touchGestureState = reactive({
  mode: null,
  initialDistance: 0,
  initialZoom: 0,
  initialPanX: 0,
  initialPanY: 0,
  initialCenterX: 0,
  initialCenterY: 0,
})
const previewDragState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
})
const isPlantingDialogOpen = ref(false)
const selectedPlantId = ref(defaultPlantId.value)
const plantingMode = ref('single')
const plantingLayoutMode = ref('grid')
const freePlacementSnap = ref(true)
const cropPlanMethodOptions = [
  { label: 'Direct Sow', value: 'direct_sow' },
  { label: 'Transplant', value: 'transplant' },
  { label: 'Indoor Start', value: 'indoor_start' },
]
const hoveredPlantingPoint = ref(null)
const selectedPreviewPlantingId = ref(null)
const freeDragState = reactive({
  active: false,
  pointerId: null,
  plantingId: null,
  xFeet: 0,
  yFeet: 0,
})
const suppressGuidedTransplantCancel = ref(false)

const showMinorGrid = computed(() => viewport.value.zoom >= 3)
const viewportTouchAction = computed(() => (interactionMode.value === 'pan' ? 'none' : 'pan-y'))
const supportsSelectedBedHeight = computed(() => bedSupportsHeight(selectedBed.value?.type))
const selectedPlant = computed(() => plantStore.getPlantById(selectedPlantId.value))
const selectedBedCropPlans = computed(() => {
  if (!selectedBed.value?.id) {
    return []
  }

  return planningStore.getCropPlansByAreaId(selectedBed.value.id).map((cropPlan) => {
    const plant = plantStore.getPlantById(cropPlan.plantId)

    return {
      ...cropPlan,
      plantName: plant?.name ?? cropPlan.plantId,
      methodLabel: cropPlan.method === 'indoor_start'
        ? 'Indoor Start'
        : cropPlan.method === 'transplant'
          ? 'Transplant'
          : 'Direct Sow',
    }
  })
})
const selectedPlantPlacedCount = computed(() => {
  if (!selectedBed.value || !selectedPlantId.value) {
    return 0
  }

  return getBedPlantings(selectedBed.value).filter((planting) => planting.plantId === selectedPlantId.value).length
})
const selectedPlantCropPlan = computed(() => {
  if (!selectedBed.value?.id || !selectedPlantId.value) {
    return null
  }

  return planningStore.getCropPlanByAreaAndPlantId(selectedBed.value.id, selectedPlantId.value) ?? {
    id: null,
    areaId: selectedBed.value.id,
    plantId: selectedPlantId.value,
    method: selectedPlant.value?.defaultPlanningMethod ?? 'direct_sow',
    targetQuantity: selectedPlantPlacedCount.value,
    successionIndex: 0,
    notes: '',
  }
})
const selectedPlantRemainingCount = computed(() => {
  if (!selectedPlantCropPlan.value) {
    return 0
  }

  return Math.max((selectedPlantCropPlan.value.targetQuantity ?? 0) - selectedPlantPlacedCount.value, 0)
})
const isGuidedTransplantActive = computed(() => (
  props.workspaceMode === 'current'
  && Boolean(props.guidedTransplantRequest?.batchId)
  && props.guidedTransplantRequest?.areaId === selectedBed.value?.id
  && props.guidedTransplantRequest?.plantId === selectedPlantId.value
))
const grid = computed(() => buildGridLines(
  gardenDimensions.value.widthFeet,
  gardenDimensions.value.lengthFeet,
  showMinorGrid.value,
))
const plantingPoints = computed(() => {
  if (!selectedBed.value || !selectedPlantId.value) {
    return []
  }

  return getAreaPlantingPoints(selectedBed.value, selectedPlantId.value)
})
const previewPlantings = computed(() => {
  if (!selectedBed.value) {
    return []
  }

  return getBedPlantings(selectedBed.value).map((planting) => (
    freeDragState.active && freeDragState.plantingId === planting.id
      ? { ...planting, xFeet: freeDragState.xFeet, yFeet: freeDragState.yFeet }
      : planting
  ))
})
const guidedSuggestedPlantings = computed(() => {
  if (!isGuidedTransplantActive.value || !selectedBed.value) {
    return []
  }

  const currentPointKeys = new Set(getBedPlantings(selectedBed.value).map((planting) => getPointKey(planting)))
  return getPlannedBedPlantings(selectedBed.value)
    .filter((planting) => planting.plantId === selectedPlantId.value)
    .filter((planting) => !currentPointKeys.has(getPointKey(planting)))
})
const guidedTransplantPlacedCount = computed(() => {
  if (!isGuidedTransplantActive.value || !selectedBed.value) {
    return 0
  }

  const currentPlantCount = getBedPlantings(selectedBed.value)
    .filter((planting) => planting.plantId === selectedPlantId.value)
    .length
  return Math.max(0, currentPlantCount - (props.guidedTransplantRequest?.initialCurrentCount ?? 0))
})
const selectedPreviewPlanting = computed(() => (
  previewPlantings.value.find((planting) => planting.id === selectedPreviewPlantingId.value) ?? null
))
const freePlacementConflictCount = computed(() => previewPlantings.value.filter((planting) => plantingHasConflict(planting)).length)
const freePlacementBoundaryCount = computed(() => previewPlantings.value.filter((planting) => plantingHasBoundaryConflict(planting)).length)
const plantingPreviewLayout = computed(() => {
  if (!selectedBed.value) {
    return {
      width: 0,
      height: 0,
      padding: 24,
      areaWidth: 0,
      areaHeight: 0,
    }
  }

  const padding = 24
  const areaWidth = feetToPixels(selectedBed.value.widthFeet)
  const areaHeight = feetToPixels(selectedBed.value.heightFeet)

  return {
    width: areaWidth + (padding * 2),
    height: areaHeight + (padding * 2),
    padding,
    areaWidth,
    areaHeight,
  }
})
const previewSelectionBox = computed(() => ({
  x: Math.min(previewDragState.startX, previewDragState.currentX),
  y: Math.min(previewDragState.startY, previewDragState.currentY),
  width: Math.abs(previewDragState.currentX - previewDragState.startX),
  height: Math.abs(previewDragState.currentY - previewDragState.startY),
}))
const transform = computed(() => {
  const { panX, panY, zoom } = viewport.value
  return `translate(${panX} ${panY}) scale(${zoom})`
})
const selectedBedMenuStyle = computed(() => {
  if (!selectedBed.value) {
    return {}
  }

  const panelWidth = 264
  const panelHeight = supportsSelectedBedHeight.value ? 252 : 224
  const edgePadding = 12
  const offset = 18
  const { zoom, panX, panY } = viewport.value
  const footprint = getBedFootprint(selectedBed.value)
  const bedLeft = panX + feetToPixels(selectedBed.value.xFeet) * zoom
  const bedTop = panY + feetToPixels(selectedBed.value.yFeet) * zoom
  const bedWidth = feetToPixels(footprint.widthFeet) * zoom
  const bedHeight = feetToPixels(footprint.heightFeet) * zoom
  const shouldFlipLeft = bedLeft + bedWidth + offset + panelWidth > viewportSize.width
  const unclampedLeft = shouldFlipLeft
    ? bedLeft - panelWidth - offset
    : bedLeft + bedWidth + offset
  const unclampedTop = bedTop + bedHeight / 2 - panelHeight / 2

  return {
    left: `${clamp(unclampedLeft, edgePadding, Math.max(viewportSize.width - panelWidth - edgePadding, edgePadding))}px`,
    top: `${clamp(unclampedTop, edgePadding, Math.max(viewportSize.height - panelHeight - edgePadding, edgePadding))}px`,
  }
})

watch(selectedBed, (nextBed) => {
  if (!nextBed) {
    isPlantingDialogOpen.value = false
    return
  }

  if (!plantStore.getPlantById(selectedPlantId.value)) {
    selectedPlantId.value = defaultPlantId.value
  }
})

watch(defaultPlantId, (nextDefaultPlantId) => {
  if (!selectedPlantId.value) {
    selectedPlantId.value = nextDefaultPlantId
  }
})

watch(
  () => props.plantingRequest?.key,
  async () => {
    if (!props.plantingRequest?.areaId || props.plantingRequest?.workspaceMode !== props.workspaceMode) {
      return
    }

    await nextTick()

    if (selectedBed.value?.id !== props.plantingRequest.areaId) {
      return
    }

    if (props.plantingRequest.plantId && plantStore.getPlantById(props.plantingRequest.plantId)) {
      selectedPlantId.value = props.plantingRequest.plantId
    }

    openPlantingDialog()
  },
)

watch(
  () => props.guidedTransplantRequest?.key,
  async () => {
    if (!props.guidedTransplantRequest?.areaId || props.workspaceMode !== 'current') {
      return
    }

    await nextTick()
    gardenStore.setSelectedBed(props.guidedTransplantRequest.areaId)
    await nextTick()

    if (selectedBed.value?.id !== props.guidedTransplantRequest.areaId) {
      return
    }

    if (plantStore.getPlantById(props.guidedTransplantRequest.plantId)) {
      selectedPlantId.value = props.guidedTransplantRequest.plantId
    }

    openPlantingDialog()
  },
)

function getBedGrid(bed) {
  return buildBedGridLines(bed.widthFeet, bed.heightFeet, showMinorGrid.value)
}

function getBedPlantings(bed) {
  if (!bed?.id) {
    return []
  }

  return props.workspaceMode === 'current'
    ? planningStore.getCurrentPlantingsByAreaId(bed.id)
    : planningStore.getPlantingsByAreaId(bed.id)
}

function getPlannedBedPlantings(bed) {
  return bed?.id ? planningStore.getPlantingsByAreaId(bed.id) : []
}

function getBedPlantingsBySymbol(bed) {
  return getBedPlantings(bed).reduce((groups, planting) => {
    const symbol = getPlantSymbol(planting.plantId)
    groups[symbol].push(planting)
    return groups
  }, {
    ring: [],
    diamond: [],
    leaf: [],
    root: [],
    clover: [],
    sun: [],
  })
}

function getPlantingSummary(bed) {
  return summarizePlantings(getBedPlantings(bed))
}

function getPlantColor(plantId) {
  return plantStore.getPlantById(plantId)?.color ?? '#4b5f49'
}

function getPlantSymbol(plantId) {
  return plantStore.getPlantById(plantId)?.symbol ?? 'ring'
}

function getPlantMarkerRadius(plantId) {
  const plant = plantStore.getPlantById(plantId)
  return plant ? clamp(plant.spacingInches / 6, 4, 8) : 5
}

function getPlantShortLabel(plantId) {
  const plant = plantStore.getPlantById(plantId)
  return plant?.shortLabel ?? plant?.name?.slice(0, 2) ?? '?'
}

function getPlantSpacingRadiusFeet(plantId) {
  const plant = plantStore.getPlantById(plantId)
  return plant ? spacingInchesToFeet(plant.spacingInches) / 2 : 0
}

function getLeafPath(planting) {
  const x = feetToPixels(planting.xFeet)
  const y = feetToPixels(planting.yFeet)
  const r = getPlantMarkerRadius(planting.plantId)
  return `M ${x} ${y - r} C ${x + r} ${y - r}, ${x + r} ${y + r * 0.25}, ${x} ${y + r}
    C ${x - r} ${y + r * 0.25}, ${x - r} ${y - r}, ${x} ${y - r} Z`
}

function getRootPath(planting) {
  const x = feetToPixels(planting.xFeet)
  const y = feetToPixels(planting.yFeet)
  const r = getPlantMarkerRadius(planting.plantId)
  return `M ${x} ${y - r}
    C ${x + r * 0.8} ${y - r * 0.3}, ${x + r * 0.3} ${y + r * 0.7}, ${x} ${y + r}
    C ${x - r * 0.3} ${y + r * 0.7}, ${x - r * 0.8} ${y - r * 0.3}, ${x} ${y - r} Z`
}

function getCloverPath(planting) {
  const x = feetToPixels(planting.xFeet)
  const y = feetToPixels(planting.yFeet)
  const r = getPlantMarkerRadius(planting.plantId) * 0.7
  return `M ${x} ${y - r * 1.8}
    a ${r} ${r} 0 1 1 0.01 0
    M ${x + r * 1.2} ${y}
    a ${r} ${r} 0 1 1 0.01 0
    M ${x} ${y + r * 1.2}
    a ${r} ${r} 0 1 1 0.01 0
    M ${x - r * 1.2} ${y}
    a ${r} ${r} 0 1 1 0.01 0`
}

function getSunRayPath(planting) {
  const x = feetToPixels(planting.xFeet)
  const y = feetToPixels(planting.yFeet)
  const r = getPlantMarkerRadius(planting.plantId) * 1.35
  return `M ${x - r} ${y} L ${x + r} ${y}
    M ${x} ${y - r} L ${x} ${y + r}
    M ${x - r * 0.7} ${y - r * 0.7} L ${x + r * 0.7} ${y + r * 0.7}
    M ${x + r * 0.7} ${y - r * 0.7} L ${x - r * 0.7} ${y + r * 0.7}`
}

function getBedSummaryWidth(bed) {
  const summary = getPlantingSummary(bed)
  return Math.min(Math.max(summary.slice(0, 3).reduce((max, entry) => {
    const label = `${entry.plant.shortLabel ?? entry.plant.name} x${entry.count}`
    return Math.max(max, label.length)
  }, 0) * 6.4 + 28, 96), Math.max(feetToPixels(bed.widthFeet) - 12, 96))
}

function getBedSummaryHeight(bed) {
  const visibleItems = Math.min(getPlantingSummary(bed).length, 3)
  const baseHeight = visibleItems * 14 + 12
  return getPlantingSummary(bed).length > 3 ? baseHeight + 12 : baseHeight
}

function getBedSummaryX(bed) {
  const widthPixels = feetToPixels(bed.widthFeet)
  return Math.max(widthPixels - getBedSummaryWidth(bed) - 8, 8)
}

function getBedSummaryY() {
  return 32
}

function getBedLabelX(bed) {
  const footprint = getBedFootprint(bed)
  return feetToPixels(footprint.widthFeet) / 2
}

function getBedLabelY(bed) {
  const footprint = getBedFootprint(bed)
  const bedTopPixels = feetToPixels(bed.yFeet)
  const bedHeightPixels = feetToPixels(footprint.heightFeet)
  const preferredAboveY = -10
  const preferredBelowY = bedHeightPixels + 18
  const minLabelY = 18
  const maxLabelY = Math.max(grid.value.heightPixels - 12, minLabelY)
  const preferredAboveAbsoluteY = bedTopPixels + preferredAboveY
  const preferredBelowAbsoluteY = bedTopPixels + preferredBelowY

  if (preferredAboveAbsoluteY >= minLabelY) {
    return preferredAboveY
  }

  if (preferredBelowAbsoluteY <= maxLabelY) {
    return preferredBelowY
  }

  return Math.min(Math.max(preferredAboveAbsoluteY, minLabelY), maxLabelY) - bedTopPixels
}

function getBedClipPathId(bed) {
  return `bed-clip-${bed.id}`
}

function getBedRenderTransform(bed) {
  const widthPixels = feetToPixels(bed.widthFeet)
  const heightPixels = feetToPixels(bed.heightFeet)
  const rotationDegrees = normalizeBedRotation(bed.rotationDegrees)

  if (rotationDegrees === 90) {
    return `translate(${heightPixels} 0) rotate(90)`
  }

  if (rotationDegrees === 180) {
    return `translate(${widthPixels} ${heightPixels}) rotate(180)`
  }

  if (rotationDegrees === 270) {
    return `translate(0 ${widthPixels}) rotate(270)`
  }

  return ''
}

function rotateSelectedBed() {
  if (!selectedBed.value) {
    return
  }

  gardenStore.updateBed(selectedBed.value.id, {
    rotationDegrees: normalizeBedRotation(selectedBed.value.rotationDegrees + 90),
  })
}

function openPlantingDialog() {
  if (!selectedBed.value) {
    return
  }

  isPlantingDialogOpen.value = true
  plantingMode.value = 'single'
  plantingLayoutMode.value = 'grid'
  resetPreviewDrag()
  resetFreeDrag()
}

function closePlantingDialog() {
  const shouldCancelGuidedTransplant = isGuidedTransplantActive.value && !suppressGuidedTransplantCancel.value
  isPlantingDialogOpen.value = false
  resetPreviewDrag()
  resetFreeDrag()
  hoveredPlantingPoint.value = null
  selectedPreviewPlantingId.value = null
  suppressGuidedTransplantCancel.value = false

  if (shouldCancelGuidedTransplant) {
    emit('cancel-guided-transplant')
  }
}

function getPointKey(point) {
  return `${point.xFeet.toFixed(4)}:${point.yFeet.toFixed(4)}`
}

function getPlantingAtPoint(point) {
  return getBedPlantings(selectedBed.value ?? {}).find((planting) => getPointKey(planting) === getPointKey(point)) ?? null
}

function getPreviewPointFill(point) {
  const planting = getPlantingAtPoint(point)
  return planting ? getPlantColor(planting.plantId) : 'rgba(255, 255, 255, 0.22)'
}

function getPreviewPointStroke(point) {
  const planting = getPlantingAtPoint(point)
  return planting ? 'rgba(36, 52, 28, 0.6)' : 'rgba(255, 252, 244, 0.85)'
}

function buildPlanting(point, plantId) {
  const existing = getPlantingAtPoint(point)

  return {
    id: existing?.id ?? `planting-${Date.now()}-${Math.round(point.xFeet * 100)}-${Math.round(point.yFeet * 100)}`,
    plantId,
    xFeet: point.xFeet,
    yFeet: point.yFeet,
  }
}

function setSelectedBedPlantings(nextPlantings) {
  if (!selectedBed.value) {
    return
  }

  if (props.workspaceMode === 'current') {
    planningStore.setCurrentAreaPlantings(selectedBed.value.id, nextPlantings)
    return
  }

  planningStore.setAreaPlantings(selectedBed.value.id, nextPlantings)
}

function updateSelectedCropPlan(updates) {
  if (!selectedBed.value?.id || !selectedPlantId.value) {
    return
  }

  planningStore.upsertCropPlan(selectedBed.value.id, selectedPlantId.value, updates)
}

function togglePlantingAtPoint(point) {
  if (!selectedBed.value || !selectedPlantId.value) {
    return
  }

  const currentPlantings = getBedPlantings(selectedBed.value)
  const pointKey = getPointKey(point)
  const existing = currentPlantings.find((planting) => getPointKey(planting) === pointKey)

  if (existing?.plantId === selectedPlantId.value) {
    setSelectedBedPlantings(currentPlantings.filter((planting) => planting.id !== existing.id))
    return
  }

  setSelectedBedPlantings([
    ...currentPlantings.filter((planting) => getPointKey(planting) !== pointKey),
    buildPlanting(point, selectedPlantId.value),
  ])
}

function applyPlantToPoints(targetPoints) {
  if (!selectedBed.value || !selectedPlantId.value || !targetPoints.length) {
    return
  }

  const pointKeys = new Set(targetPoints.map((point) => getPointKey(point)))
  const currentPlantings = getBedPlantings(selectedBed.value).filter((planting) => !pointKeys.has(getPointKey(planting)))
  setSelectedBedPlantings([
    ...currentPlantings,
    ...targetPoints.map((point) => buildPlanting(point, selectedPlantId.value)),
  ])
}

function placePlannedPlantings() {
  if (!selectedBed.value || !selectedPlantId.value || selectedPlantRemainingCount.value <= 0) {
    return
  }

  const availablePoints = plantingPoints.value.filter((point) => !getPlantingAtPoint(point))
  const pointsToPlace = availablePoints.slice(0, selectedPlantRemainingCount.value)

  applyPlantToPoints(pointsToPlace)
}

function fillAllPlantingPoints() {
  applyPlantToPoints(plantingPoints.value)
}

function placeGuidedSuggestedPlantings() {
  if (!isGuidedTransplantActive.value || !selectedBed.value || !selectedPlantId.value) {
    return
  }

  const quantity = Math.max(0, Math.round(Number(props.guidedTransplantRequest?.quantity) || 0))
  if (!quantity) {
    return
  }

  const currentPlantings = getBedPlantings(selectedBed.value)
  const currentPointKeys = new Set(currentPlantings.map((planting) => getPointKey(planting)))
  const pointsToPlace = guidedSuggestedPlantings.value
    .filter((planting) => !currentPointKeys.has(getPointKey(planting)))
    .slice(0, quantity)
    .map((planting) => ({ xFeet: planting.xFeet, yFeet: planting.yFeet }))

  if (!pointsToPlace.length) {
    return
  }

  setSelectedBedPlantings([
    ...currentPlantings,
    ...pointsToPlace.map((point) => buildPlanting(point, selectedPlantId.value)),
  ])
}

function clearSelectedPlantings() {
  setSelectedBedPlantings([])
}

function finishGuidedTransplant() {
  if (!isGuidedTransplantActive.value || !props.guidedTransplantRequest?.assignmentId || guidedTransplantPlacedCount.value <= 0) {
    return
  }

  suppressGuidedTransplantCancel.value = true
  emit('finish-guided-transplant', {
    assignmentId: props.guidedTransplantRequest.assignmentId,
    batchId: props.guidedTransplantRequest.batchId,
    cropPlanId: props.guidedTransplantRequest.cropPlanId,
    placedCount: guidedTransplantPlacedCount.value,
  })
  closePlantingDialog()
}

function getPreviewSvgPoint(event) {
  const svg = event.currentTarget

  if (!svg) {
    return null
  }

  const svgPoint = svg.createSVGPoint()
  const ctm = svg.getScreenCTM()

  if (!ctm) {
    return null
  }

  svgPoint.x = event.clientX
  svgPoint.y = event.clientY

  const transformedPoint = svgPoint.matrixTransform(ctm.inverse())

  return {
    x: transformedPoint.x - plantingPreviewLayout.value.padding,
    y: transformedPoint.y - plantingPreviewLayout.value.padding,
  }
}

function findNearestPlantingPoint(svgPoint) {
  const threshold = 12
  let nearestPoint = null
  let nearestDistance = Number.POSITIVE_INFINITY

  plantingPoints.value.forEach((point) => {
    const pointX = feetToPixels(point.xFeet)
    const pointY = feetToPixels(point.yFeet)
    const distance = Math.hypot(pointX - svgPoint.x, pointY - svgPoint.y)

    if (distance < nearestDistance && distance <= threshold) {
      nearestDistance = distance
      nearestPoint = point
    }
  })

  return nearestPoint
}

function resetPreviewDrag() {
  previewDragState.active = false
  previewDragState.startX = 0
  previewDragState.startY = 0
  previewDragState.currentX = 0
  previewDragState.currentY = 0
}

function resetFreeDrag() {
  freeDragState.active = false
  freeDragState.pointerId = null
  freeDragState.plantingId = null
  freeDragState.xFeet = 0
  freeDragState.yFeet = 0
}

function clampPointToSelectedArea(xFeet, yFeet) {
  if (!selectedBed.value) {
    return { xFeet: 0, yFeet: 0 }
  }

  const widthFeet = selectedBed.value.widthFeet
  const heightFeet = selectedBed.value.heightFeet
  let nextX = clamp(xFeet, 0, widthFeet)
  let nextY = clamp(yFeet, 0, heightFeet)

  if (selectedBed.value.type !== 'pot' || isPointInsideArea(selectedBed.value, nextX, nextY)) {
    return { xFeet: nextX, yFeet: nextY }
  }

  const centerX = widthFeet / 2
  const centerY = heightFeet / 2
  const radiusX = widthFeet / 2
  const radiusY = heightFeet / 2
  const deltaX = nextX - centerX
  const deltaY = nextY - centerY
  const distance = Math.sqrt(((deltaX ** 2) / (radiusX ** 2)) + ((deltaY ** 2) / (radiusY ** 2)))

  if (!distance) {
    return { xFeet: centerX, yFeet: centerY }
  }

  const scale = 0.98 / distance
  return {
    xFeet: centerX + (deltaX * scale),
    yFeet: centerY + (deltaY * scale),
  }
}

function getAreaFeetPoint(svgPoint) {
  let xFeet = pixelsToFeet(svgPoint.x)
  let yFeet = pixelsToFeet(svgPoint.y)

  if (freePlacementSnap.value) {
    xFeet = snapToIncrement(xFeet, 1 / 12)
    yFeet = snapToIncrement(yFeet, 1 / 12)
  }

  return clampPointToSelectedArea(xFeet, yFeet)
}

function findNearestExistingPlanting(svgPoint) {
  const threshold = 14
  let nearestPlanting = null
  let nearestDistance = Number.POSITIVE_INFINITY

  previewPlantings.value.forEach((planting) => {
    const pointX = feetToPixels(planting.xFeet)
    const pointY = feetToPixels(planting.yFeet)
    const distance = Math.hypot(pointX - svgPoint.x, pointY - svgPoint.y)

    if (distance < nearestDistance && distance <= threshold) {
      nearestDistance = distance
      nearestPlanting = planting
    }
  })

  return nearestPlanting
}

function updateSelectedBedPlanting(plantingId, updates) {
  if (!selectedBed.value) {
    return
  }

  const nextPlantings = getBedPlantings(selectedBed.value).map((planting) => (
    planting.id === plantingId ? { ...planting, ...updates } : planting
  ))

  setSelectedBedPlantings(nextPlantings)
}

function deleteSelectedPreviewPlanting() {
  if (!selectedBed.value || !selectedPreviewPlantingId.value) {
    return
  }

  setSelectedBedPlantings(
    getBedPlantings(selectedBed.value).filter((planting) => planting.id !== selectedPreviewPlantingId.value),
  )
  selectedPreviewPlantingId.value = null
}

function plantingHasConflict(targetPlanting) {
  const targetRadius = getPlantSpacingRadiusFeet(targetPlanting.plantId)

  return previewPlantings.value.some((planting) => {
    if (planting.id === targetPlanting.id) {
      return false
    }

    const distance = Math.hypot(planting.xFeet - targetPlanting.xFeet, planting.yFeet - targetPlanting.yFeet)
    return distance < (targetRadius + getPlantSpacingRadiusFeet(planting.plantId)) - 0.0001
  })
}

function plantingHasBoundaryConflict(planting) {
  if (!selectedBed.value) {
    return false
  }

  const radius = getPlantSpacingRadiusFeet(planting.plantId)
  const sampleCount = 16

  for (let index = 0; index < sampleCount; index += 1) {
    const angle = (Math.PI * 2 * index) / sampleCount
    const sampleX = planting.xFeet + (Math.cos(angle) * radius)
    const sampleY = planting.yFeet + (Math.sin(angle) * radius)

    if (!isPointInsideArea(selectedBed.value, sampleX, sampleY)) {
      return true
    }
  }

  return false
}

function handlePlantingPreviewPointerDown(event) {
  const svgPoint = getPreviewSvgPoint(event)

  if (!svgPoint) {
    return
  }

  if (plantingLayoutMode.value === 'free') {
    const nearestPlanting = findNearestExistingPlanting(svgPoint)

    if (nearestPlanting) {
      selectedPreviewPlantingId.value = nearestPlanting.id
      freeDragState.active = true
      freeDragState.pointerId = event.pointerId
      freeDragState.plantingId = nearestPlanting.id
      freeDragState.xFeet = nearestPlanting.xFeet
      freeDragState.yFeet = nearestPlanting.yFeet
      event.currentTarget?.setPointerCapture(event.pointerId)
      return
    }

    const areaPoint = getAreaFeetPoint(svgPoint)
    const currentPlantings = selectedBed.value ? getBedPlantings(selectedBed.value) : []
    selectedPreviewPlantingId.value = null
    setSelectedBedPlantings([
      ...currentPlantings,
      buildPlanting(areaPoint, selectedPlantId.value),
    ])
    return
  }

  if (plantingMode.value === 'single') {
    const nearestPoint = findNearestPlantingPoint(svgPoint)
    hoveredPlantingPoint.value = nearestPoint

    if (nearestPoint) {
      togglePlantingAtPoint(nearestPoint)
    }

    return
  }

  previewDragState.active = true
  previewDragState.startX = svgPoint.x
  previewDragState.startY = svgPoint.y
  previewDragState.currentX = svgPoint.x
  previewDragState.currentY = svgPoint.y
  event.currentTarget?.setPointerCapture(event.pointerId)
}

function handlePlantingPreviewPointerMove(event) {
  const svgPoint = getPreviewSvgPoint(event)

  if (!svgPoint) {
    return
  }

  if (plantingLayoutMode.value === 'free') {
    hoveredPlantingPoint.value = null

    if (!freeDragState.active || freeDragState.pointerId !== event.pointerId) {
      return
    }

    const areaPoint = getAreaFeetPoint(svgPoint)
    freeDragState.xFeet = areaPoint.xFeet
    freeDragState.yFeet = areaPoint.yFeet
    return
  }

  hoveredPlantingPoint.value = plantingMode.value === 'single'
    ? findNearestPlantingPoint(svgPoint)
    : null

  if (!previewDragState.active || plantingMode.value !== 'drag') {
    return
  }

  previewDragState.currentX = svgPoint.x
  previewDragState.currentY = svgPoint.y
}

function handlePlantingPreviewPointerUp(event) {
  if (plantingLayoutMode.value === 'free') {
    if (freeDragState.active && freeDragState.pointerId === event.pointerId && freeDragState.plantingId) {
      selectedPreviewPlantingId.value = freeDragState.plantingId
      updateSelectedBedPlanting(freeDragState.plantingId, {
        xFeet: freeDragState.xFeet,
        yFeet: freeDragState.yFeet,
      })
    }

    if (event.currentTarget?.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    resetFreeDrag()
    return
  }

  if (!previewDragState.active || plantingMode.value !== 'drag') {
    if (plantingMode.value !== 'single') {
      hoveredPlantingPoint.value = null
    }
    resetPreviewDrag()
    return
  }

  const box = previewSelectionBox.value
  const selectedPoints = plantingPoints.value.filter((point) => {
    const pointX = feetToPixels(point.xFeet)
    const pointY = feetToPixels(point.yFeet)

    return (
      pointX >= box.x &&
      pointX <= box.x + box.width &&
      pointY >= box.y &&
      pointY <= box.y + box.height
    )
  })

  applyPlantToPoints(selectedPoints)

  if (event.currentTarget?.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  resetPreviewDrag()
  hoveredPlantingPoint.value = null
}

function handlePlantingPreviewPointerLeave(event) {
  if (plantingLayoutMode.value === 'free') {
    if (freeDragState.active) {
      handlePlantingPreviewPointerUp(event)
    }

    return
  }

  if (previewDragState.active && plantingMode.value === 'drag') {
    handlePlantingPreviewPointerUp(event)
    return
  }

  hoveredPlantingPoint.value = null
}

function updateViewportSize() {
  viewportSize.width = viewportRef.value?.clientWidth ?? 0
  viewportSize.height = viewportRef.value?.clientHeight ?? 0
}

onMounted(() => {
  updateViewportSize()
  window.addEventListener('resize', updateViewportSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportSize)
})

function getViewportPoint(event) {
  const element = viewportRef.value
  const rect = element.getBoundingClientRect()

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function getActiveTouchPoints() {
  return Object.values(touchPoints)
}

function syncTouchPoint(event) {
  touchPoints[event.pointerId] = {
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
  }
}

function removeTouchPoint(pointerId) {
  delete touchPoints[pointerId]
}

function getTouchCenter(points) {
  if (points.length < 2) {
    return { x: 0, y: 0 }
  }

  return {
    x: (points[0].clientX + points[1].clientX) / 2,
    y: (points[0].clientY + points[1].clientY) / 2,
  }
}

function getTouchDistance(points) {
  if (points.length < 2) {
    return 0
  }

  const deltaX = points[0].clientX - points[1].clientX
  const deltaY = points[0].clientY - points[1].clientY
  return Math.hypot(deltaX, deltaY)
}

function releasePointerCapture(pointerId) {
  if (pointerId !== null && viewportRef.value?.hasPointerCapture(pointerId)) {
    viewportRef.value.releasePointerCapture(pointerId)
  }
}

function resetPointerState() {
  pointerState.mode = null
  pointerState.pointerId = null
  pointerState.bedId = null
}

function beginPinchGesture() {
  const points = getActiveTouchPoints()

  if (points.length < 2) {
    return
  }

  releasePointerCapture(pointerState.pointerId)
  resetPointerState()

  const center = getTouchCenter(points)
  touchGestureState.mode = 'pinch'
  touchGestureState.initialDistance = Math.max(getTouchDistance(points), 1)
  touchGestureState.initialZoom = viewport.value.zoom
  touchGestureState.initialPanX = viewport.value.panX
  touchGestureState.initialPanY = viewport.value.panY
  touchGestureState.initialCenterX = center.x
  touchGestureState.initialCenterY = center.y

  points.forEach((point) => {
    viewportRef.value?.setPointerCapture(point.pointerId)
  })
}

function updatePinchGesture() {
  const points = getActiveTouchPoints()

  if (touchGestureState.mode !== 'pinch' || points.length < 2) {
    return
  }

  const nextZoom = touchGestureState.initialZoom * (
    getTouchDistance(points) / Math.max(touchGestureState.initialDistance, 1)
  )
  const zoomCenter = {
    x: touchGestureState.initialCenterX,
    y: touchGestureState.initialCenterY,
  }
  const nextViewport = zoomAroundPoint(
    {
      zoom: touchGestureState.initialZoom,
      panX: touchGestureState.initialPanX,
      panY: touchGestureState.initialPanY,
    },
    nextZoom,
    zoomCenter,
  )
  const currentCenter = getTouchCenter(points)

  gardenStore.viewport = {
    ...nextViewport,
    panX: nextViewport.panX + currentCenter.x - touchGestureState.initialCenterX,
    panY: nextViewport.panY + currentCenter.y - touchGestureState.initialCenterY,
  }
}

function resetTouchGestureState() {
  touchGestureState.mode = null
  touchGestureState.initialDistance = 0
  touchGestureState.initialZoom = 0
  touchGestureState.initialPanX = 0
  touchGestureState.initialPanY = 0
  touchGestureState.initialCenterX = 0
  touchGestureState.initialCenterY = 0
}

function handleWheel(event) {
  const point = getViewportPoint(event)
  const delta = event.deltaY > 0 ? -0.25 : 0.25
  gardenStore.setViewportZoom(viewport.value.zoom + delta, point)
}

function handleViewportPointerDown(event) {
  if (event.pointerType === 'touch') {
    syncTouchPoint(event)

    if (getActiveTouchPoints().length >= 2) {
      beginPinchGesture()
      return
    }
  }

  if (interactionMode.value !== 'pan') {
    if (event.pointerType !== 'touch') {
      gardenStore.clearSelection()
    }
    return
  }

  pointerState.mode = 'pan'
  pointerState.pointerId = event.pointerId
  pointerState.startClientX = event.clientX
  pointerState.startClientY = event.clientY
  pointerState.startPanX = viewport.value.panX
  pointerState.startPanY = viewport.value.panY
  viewportRef.value?.setPointerCapture(event.pointerId)
}

function handleBedPointerDown(event, bedId) {
  if (event.pointerType === 'touch') {
    syncTouchPoint(event)

    if (getActiveTouchPoints().length >= 2) {
      beginPinchGesture()
      return
    }
  }

  gardenStore.setSelectedBed(bedId)

  if (interactionMode.value !== 'select') {
    return
  }

  const bed = beds.value.find((item) => item.id === bedId)
  if (!bed) {
    return
  }

  pointerState.mode = 'bed'
  pointerState.pointerId = event.pointerId
  pointerState.bedId = bedId
  pointerState.startClientX = event.clientX
  pointerState.startClientY = event.clientY
  pointerState.startBedXFeet = bed.xFeet
  pointerState.startBedYFeet = bed.yFeet
  viewportRef.value?.setPointerCapture(event.pointerId)
}

function handlePointerMove(event) {
  if (event.pointerType === 'touch' && touchPoints[event.pointerId]) {
    syncTouchPoint(event)

    if (touchGestureState.mode === 'pinch') {
      updatePinchGesture()
      return
    }
  }

  if (pointerState.pointerId !== event.pointerId) {
    return
  }

  if (pointerState.mode === 'pan') {
    const deltaX = event.clientX - pointerState.startClientX
    const deltaY = event.clientY - pointerState.startClientY
    gardenStore.viewport.panX = pointerState.startPanX + deltaX
    gardenStore.viewport.panY = pointerState.startPanY + deltaY
    return
  }

  if (pointerState.mode === 'bed' && pointerState.bedId) {
    const deltaX = pixelsToFeet((event.clientX - pointerState.startClientX) / viewport.value.zoom)
    const deltaY = pixelsToFeet((event.clientY - pointerState.startClientY) / viewport.value.zoom)

    gardenStore.moveBed(
      pointerState.bedId,
      pointerState.startBedXFeet + deltaX,
      pointerState.startBedYFeet + deltaY,
    )
  }
}

function handlePointerUp(event) {
  if (event?.pointerType === 'touch') {
    releasePointerCapture(event.pointerId)
    removeTouchPoint(event.pointerId)

    if (touchGestureState.mode === 'pinch' && getActiveTouchPoints().length < 2) {
      resetTouchGestureState()
    }
  }

  releasePointerCapture(pointerState.pointerId)
  resetPointerState()
}
</script>

<style scoped>
.planner-viewport {
  position: relative;
  min-height: 560px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(196, 230, 184, 0.9), rgba(245, 239, 224, 0.9)),
    linear-gradient(135deg, #f7f4e8, #edf5e6);
  border: 1px solid rgba(78, 101, 72, 0.18);
  cursor: default;
}

.planner-viewport--panning {
  cursor: grab;
}

.planner-svg {
  width: 100%;
  height: 100%;
  min-height: 560px;
  display: block;
}

.garden-surface {
  fill: #f0f8ec;
  stroke: #51684f;
  stroke-width: 2;
}

.grid-line {
  vector-effect: non-scaling-stroke;
}

.grid-line--major {
  stroke: rgba(79, 109, 74, 0.5);
  stroke-width: 1;
}

.grid-line--minor {
  stroke: rgba(79, 109, 74, 0.15);
  stroke-width: 1;
}

.bed-group {
  cursor: move;
  touch-action: none;
}

.bed-shape {
  stroke: rgba(47, 31, 20, 0.75);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.bed-shape--regular {
  stroke-dasharray: 10 6;
}

.bed-shape--raised,
.bed-shape--pot {
  stroke-width: 3;
}

.bed-rim {
  fill: none;
  stroke: rgba(255, 244, 229, 0.45);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.bed-grid-line {
  vector-effect: non-scaling-stroke;
}

.bed-grid-line--major {
  stroke: rgba(255, 248, 234, 0.42);
  stroke-width: 1;
}

.bed-grid-line--minor {
  stroke: rgba(255, 248, 234, 0.18);
  stroke-width: 1;
}

.planting-dot {
  stroke: rgba(255, 252, 244, 0.9);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.planting-ring,
.planting-sun-ray {
  fill: none;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.planting-shape {
  stroke: rgba(255, 252, 244, 0.9);
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}

.bed-summary__panel {
  fill: rgba(255, 252, 244, 0.88);
  stroke: rgba(65, 79, 57, 0.14);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.bed-summary__text,
.bed-summary__more {
  fill: #354630;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.bed-group--selected .bed-shape {
  stroke: #d7f171;
  stroke-width: 3;
}

.bed-label {
  fill: #2f402a;
  font-size: 16px;
  font-weight: 600;
  user-select: none;
}

.bed-label--centered {
  text-anchor: middle;
}

.bed-editor {
  position: absolute;
  z-index: 2;
  width: 264px;
  border-radius: 14px;
  background: rgba(255, 252, 244, 0.94);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 28px rgba(37, 51, 34, 0.16);
}

.bed-editor__section {
  padding: 12px;
  display: grid;
  gap: 10px;
}

.bed-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.bed-editor__title-block {
  min-width: 0;
  flex: 1;
}

.bed-editor__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6f8368;
}

.bed-editor__name {
  margin-top: 2px;
}

.bed-editor__meta {
  margin-top: 2px;
  font-size: 11px;
  color: #6f756b;
}

.bed-editor__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.bed-editor__type-select {
  min-width: 0;
}

.bed-editor__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.bed-editor__field {
  min-width: 0;
}

.bed-editor__footer {
  font-size: 11px;
  color: #6f756b;
  padding-top: 2px;
}

.planting-dialog {
  width: min(920px, 92vw);
  max-width: 920px;
  border-radius: 22px;
}

.planting-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.planting-dialog__body {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.planting-dialog__controls {
  display: grid;
  gap: 12px;
}

.planting-dialog__actions {
  display: flex;
  gap: 8px;
}

.planting-dialog__legend {
  display: grid;
  gap: 6px;
  padding-top: 4px;
}

.planting-dialog__legend-item {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #455641;
}

.planting-dialog__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(46, 58, 39, 0.12);
}

.planting-dialog__legend-count {
  color: #6a7d63;
  font-weight: 600;
}

.planting-dialog__preview-shell {
  padding: 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8f5ea, #eef3e5);
  border: 1px solid rgba(78, 101, 72, 0.16);
}

.planting-preview {
  width: 100%;
  max-height: 520px;
  display: block;
  touch-action: none;
}

.planting-preview__selection {
  fill: rgba(123, 191, 88, 0.18);
  stroke: rgba(77, 117, 59, 0.65);
  stroke-dasharray: 10 6;
  stroke-width: 2;
}

.planting-preview__hover {
  fill: none;
  stroke: rgba(255, 251, 220, 0.95);
  stroke-width: 3;
}

.planting-preview__halo {
  fill: rgba(255, 255, 255, 0.12);
  stroke: rgba(255, 255, 255, 0.28);
  stroke-width: 1.5;
}

.planting-preview__halo--conflict {
  fill: rgba(214, 82, 82, 0.16);
  stroke: rgba(181, 46, 46, 0.6);
}

.planting-preview__halo--boundary {
  stroke-dasharray: 8 5;
}

.planting-preview__marker {
  stroke: rgba(255, 252, 244, 0.92);
  stroke-width: 2;
}

.planting-preview__marker--active {
  stroke: #d7f171;
  stroke-width: 3;
}

.planting-preview__label {
  fill: #24341f;
  font-size: 9px;
  font-weight: 700;
  text-anchor: middle;
  pointer-events: none;
}

.planting-preview__menu-panel {
  fill: rgba(255, 252, 244, 0.96);
  stroke: rgba(47, 62, 40, 0.16);
  stroke-width: 1;
}

.planting-preview__menu-text {
  fill: #33452d;
  font-size: 9px;
  font-weight: 700;
}

.planting-preview__menu-delete rect {
  fill: rgba(193, 0, 21, 0.12);
}

.planting-preview__menu-delete text {
  fill: #a11e25;
  font-size: 14px;
  font-weight: 700;
}

.planting-preview__menu-delete-icon {
  fill: none;
  stroke: #a11e25;
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.planner-hint {
  position: absolute;
  right: 16px;
  bottom: 16px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  color: #4b5f49;
  font-size: 12px;
  backdrop-filter: blur(6px);
}

@media (max-width: 900px) {
  .planting-dialog {
    width: min(96vw, 680px);
  }

  .planting-dialog__body {
    grid-template-columns: 1fr;
  }
}
</style>
