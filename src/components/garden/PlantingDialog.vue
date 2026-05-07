<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" @hide="$emit('close')">
    <q-card v-if="selectedBed" class="planting-dialog">
      <q-card-section class="planting-dialog__header">
        <div>
          <div class="text-overline text-positive">Plant {{ selectedBed.name }}</div>
          <div class="text-subtitle1 text-weight-medium">
            {{ selectedPlant?.name ?? 'Choose a plant' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ selectedBed.widthFeet }} x {{ selectedBed.heightFeet }} ft
            · {{ selectedPlant?.spacingInches ?? 0 }} in spacing
          </div>
        </div>

        <q-btn flat round dense icon="close" @click="$emit('close')" />
      </q-card-section>

      <q-separator />

      <q-card-section class="planting-dialog__body">
        <div class="planting-dialog__controls">
          <div v-if="workspaceMode === 'current' && guidedTransplantRequest" class="planting-dialog__guide">
            <div class="planting-dialog__guide-title">Guided Transplant Placement</div>
            <div class="text-caption text-grey-7">
              Place the actual transplanted plants in Current Garden, then confirm the tray assignment.
            </div>
            <div class="text-caption text-grey-7">
              {{ guidedTransplantPlacedCount }}/{{ guidedTransplantRequest.quantity }} placed in this guided run
            </div>
          </div>

          <q-select
            :model-value="selectedPlantId"
            :options="plantOptions"
            emit-value
            map-options
            outlined
            dense
            label="Plant"
            @update:model-value="$emit('update:selectedPlantId', $event)"
          />

          <div v-if="selectedCropPlan" class="planting-dialog__plan-editor">
            <div class="planting-dialog__plans-label">Selected Crop Plan</div>

            <q-select
              :model-value="selectedCropPlan.method"
              :options="cropPlanMethodOptions"
              emit-value
              map-options
              outlined
              dense
              label="Method"
              @update:model-value="$emit('update:selectedCropPlanMethod', $event)"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  :model-value="selectedCropPlan.targetQuantity"
                  type="number"
                  min="0"
                  step="1"
                  outlined
                  dense
                  label="Target Quantity"
                  @update:model-value="$emit('update:selectedCropPlanTargetQuantity', $event)"
                />
              </div>

              <div class="col-3">
                <div class="planting-dialog__plan-stat">
                  <div class="planting-dialog__plan-stat-label">Placed</div>
                  <div class="planting-dialog__plan-stat-value">{{ selectedCropPlanPlacedCount }}</div>
                </div>
              </div>

              <div class="col-3">
                <div class="planting-dialog__plan-stat">
                  <div class="planting-dialog__plan-stat-label">Remaining</div>
                  <div class="planting-dialog__plan-stat-value">{{ selectedCropPlanRemainingCount }}</div>
                </div>
              </div>
            </div>

            <q-input
              :model-value="selectedCropPlan.notes"
              type="textarea"
              autogrow
              outlined
              dense
              label="Notes"
              @update:model-value="$emit('update:selectedCropPlanNotes', $event)"
            />
          </div>

          <q-btn-toggle
            :model-value="plantingLayoutMode"
            dense
            unelevated
            toggle-color="positive"
            color="grey-2"
            text-color="grey-8"
            :options="[
              { label: 'Grid', value: 'grid', icon: 'grid_view' },
              { label: 'Free', value: 'free', icon: 'open_with' },
            ]"
            @update:model-value="$emit('update:plantingLayoutMode', $event)"
          />

          <q-btn-toggle
            v-if="plantingLayoutMode === 'grid'"
            :model-value="plantingMode"
            dense
            unelevated
            toggle-color="positive"
            color="grey-2"
            text-color="grey-8"
            :options="[
              { label: 'Single', value: 'single', icon: 'ads_click' },
              { label: 'Drag Area', value: 'drag', icon: 'select_all' },
            ]"
            @update:model-value="$emit('update:plantingMode', $event)"
          />

          <div v-if="plantingLayoutMode === 'grid'" class="planting-dialog__actions">
            <q-btn
              color="positive"
              unelevated
              label="Place Planned"
              :disable="selectedCropPlanRemainingCount <= 0"
              @click="$emit('place-planned')"
            />
            <q-btn
              v-if="workspaceMode === 'current' && guidedTransplantRequest"
              color="secondary"
              unelevated
              label="Use Suggested Positions"
              :disable="!guidedSuggestedPlantings.length"
              @click="$emit('place-guided-suggested')"
            />
            <q-btn color="positive" unelevated label="Fill All" @click="$emit('fill-all')" />
            <q-btn flat label="Clear Area" @click="$emit('clear-area')" />
          </div>

          <div v-else class="planting-dialog__actions">
            <q-toggle
              :model-value="freePlacementSnap"
              label="Snap to 1 in"
              color="positive"
              @update:model-value="$emit('update:freePlacementSnap', $event)"
            />
            <q-btn flat label="Clear Area" @click="$emit('clear-area')" />
          </div>

          <div class="text-caption text-grey-7">
            {{ plantingLayoutMode === 'grid'
              ? (plantingMode === 'single'
              ? 'Single mode: click planting spots to place or remove the selected plant.'
              : 'Drag mode: drag a box across planting spots to fill an area.')
              : 'Free mode: click to place plants, drag markers to reposition them, and watch spacing halos for conflicts.' }}
          </div>

          <div v-if="plantingLayoutMode === 'free'" class="text-caption text-grey-7">
            {{ freePlacementConflictCount }} spacing conflict<span v-if="freePlacementConflictCount !== 1">s</span>
            · {{ freePlacementBoundaryCount }} boundary warning<span v-if="freePlacementBoundaryCount !== 1">s</span>
          </div>

          <div v-if="plantingSummary.length" class="planting-dialog__legend">
            <div
              v-for="entry in plantingSummary"
              :key="`legend-${entry.plant.id}`"
              class="planting-dialog__legend-item"
            >
              <span class="planting-dialog__legend-dot" :style="{ backgroundColor: entry.plant.color }"></span>
              <span>{{ entry.plant.name }}</span>
              <span class="planting-dialog__legend-count">x{{ entry.count }}</span>
            </div>
          </div>

          <div v-if="cropPlans.length" class="planting-dialog__plans">
            <div class="planting-dialog__plans-label">Crop Plans</div>
            <div
              v-for="cropPlan in cropPlans"
              :key="cropPlan.id"
              class="planting-dialog__plan-item"
            >
              <span class="planting-dialog__plan-name">{{ cropPlan.plantName }}</span>
              <span class="planting-dialog__plan-meta">{{ cropPlan.targetQuantity }} planned</span>
              <span class="planting-dialog__plan-method">{{ cropPlan.methodLabel }}</span>
            </div>
          </div>

          <div v-if="workspaceMode === 'current' && guidedTransplantRequest" class="planting-dialog__actions">
            <q-btn
              color="positive"
              unelevated
              label="Finish Guided Transplant"
              :disable="guidedTransplantPlacedCount <= 0"
              @click="$emit('finish-guided-transplant')"
            />
          </div>
        </div>

        <div class="planting-dialog__preview-shell">
          <svg
            class="planting-preview"
            :viewBox="`0 0 ${plantingPreviewLayout.width} ${plantingPreviewLayout.height}`"
            preserveAspectRatio="xMinYMin meet"
            :style="{ aspectRatio: `${plantingPreviewLayout.width} / ${plantingPreviewLayout.height}` }"
            @pointerdown="$emit('preview-pointerdown', $event)"
            @pointermove="$emit('preview-pointermove', $event)"
            @pointerup="$emit('preview-pointerup', $event)"
            @pointerleave="$emit('preview-pointerleave', $event)"
          >
            <g :transform="`translate(${plantingPreviewLayout.padding} ${plantingPreviewLayout.padding})`">
              <ellipse
                v-if="selectedBed.type === 'pot'"
                :cx="plantingPreviewLayout.areaWidth / 2"
                :cy="plantingPreviewLayout.areaHeight / 2"
                :rx="plantingPreviewLayout.areaWidth / 2"
                :ry="plantingPreviewLayout.areaHeight / 2"
                :fill="getBedTypeMeta(selectedBed.type).fill"
                :stroke="getBedTypeMeta(selectedBed.type).stroke"
                stroke-width="3"
              />
              <rect
                v-else
                :x="0"
                :y="0"
                :width="plantingPreviewLayout.areaWidth"
                :height="plantingPreviewLayout.areaHeight"
                :rx="selectedBed.type === 'raised' ? 10 : 6"
                :fill="getBedTypeMeta(selectedBed.type).fill"
                :stroke="getBedTypeMeta(selectedBed.type).stroke"
                stroke-width="3"
              />

              <circle
                v-for="point in plantingLayoutMode === 'grid' ? plantingPoints : []"
                :key="getPointKey(point)"
                :cx="feetToPixels(point.xFeet)"
                :cy="feetToPixels(point.yFeet)"
                :r="6"
                :fill="getPreviewPointFill(point)"
                :stroke="getPreviewPointStroke(point)"
                stroke-width="2"
              />

              <circle
                v-if="plantingLayoutMode === 'grid' && hoveredPlantingPoint"
                class="planting-preview__hover"
                :cx="feetToPixels(hoveredPlantingPoint.xFeet)"
                :cy="feetToPixels(hoveredPlantingPoint.yFeet)"
                :r="9"
              />

              <circle
                v-for="planting in guidedSuggestedPlantings"
                :key="`${planting.id}-blueprint`"
                class="planting-preview__blueprint"
                :cx="feetToPixels(planting.xFeet)"
                :cy="feetToPixels(planting.yFeet)"
                :r="9"
              />

              <text
                v-for="planting in guidedSuggestedPlantings"
                :key="`${planting.id}-blueprint-label`"
                class="planting-preview__blueprint-label"
                :x="feetToPixels(planting.xFeet)"
                :y="feetToPixels(planting.yFeet) + 3"
              >
                {{ getPlantShortLabel(planting.plantId) }}
              </text>

              <circle
                v-for="planting in previewPlantings"
                :key="`${planting.id}-halo`"
                class="planting-preview__halo"
                :class="{
                  'planting-preview__halo--conflict': plantingHasConflict(planting),
                  'planting-preview__halo--boundary': plantingHasBoundaryConflict(planting),
                }"
                :cx="feetToPixels(planting.xFeet)"
                :cy="feetToPixels(planting.yFeet)"
                :r="feetToPixels(getPlantSpacingRadiusFeet(planting.plantId))"
              />

              <circle
                v-for="planting in previewPlantings"
                :key="`${planting.id}-marker`"
                class="planting-preview__marker"
                :class="{
                  'planting-preview__marker--active': activePlantingId === planting.id || selectedPreviewPlantingId === planting.id,
                }"
                :cx="feetToPixels(planting.xFeet)"
                :cy="feetToPixels(planting.yFeet)"
                :r="7"
                :fill="getPlantColor(planting.plantId)"
              />

              <text
                v-for="planting in previewPlantings"
                :key="`${planting.id}-label`"
                class="planting-preview__label"
                :x="feetToPixels(planting.xFeet)"
                :y="feetToPixels(planting.yFeet) + 3"
              >
                {{ getPlantShortLabel(planting.plantId) }}
              </text>

              <g
                v-if="plantingLayoutMode === 'free' && selectedPreviewPlanting"
                class="planting-preview__menu"
                :transform="`translate(${feetToPixels(selectedPreviewPlanting.xFeet) + 14} ${feetToPixels(selectedPreviewPlanting.yFeet) - 16})`"
              >
                <rect
                  class="planting-preview__menu-panel"
                  x="0"
                  y="0"
                  width="58"
                  height="22"
                  rx="11"
                />
                <text x="10" y="14" class="planting-preview__menu-text">
                  {{ getPlantShortLabel(selectedPreviewPlanting.plantId) }}
                </text>
                <g class="planting-preview__menu-delete" @pointerdown.stop @click.stop="$emit('delete-selected-plant')">
                  <rect x="34" y="3" width="20" height="16" rx="8" />
                  <path
                    d="M 40 7 H 48 M 42 7 V 6.2 C 42 5.6 42.5 5.2 43.1 5.2 H 44.9 C 45.5 5.2 46 5.6 46 6.2 V 7
                      M 40.8 8.3 L 41.5 14.4 C 41.6 15.1 42.1 15.6 42.8 15.6 H 45.2 C 45.9 15.6 46.4 15.1 46.5 14.4 L 47.2 8.3
                      M 43.2 9.2 V 13.3
                      M 44.8 9.2 V 13.3"
                    class="planting-preview__menu-delete-icon"
                  />
                </g>
              </g>

              <rect
                v-if="plantingLayoutMode === 'grid' && previewDragState.active"
                class="planting-preview__selection"
                :x="previewSelectionBox.x"
                :y="previewSelectionBox.y"
                :width="previewSelectionBox.width"
                :height="previewSelectionBox.height"
                rx="8"
              />
            </g>
          </svg>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  selectedBed: {
    type: Object,
    default: null,
  },
  selectedPlant: {
    type: Object,
    default: null,
  },
  selectedPlantId: {
    type: String,
    required: true,
  },
  plantOptions: {
    type: Array,
    required: true,
  },
  selectedCropPlan: {
    type: Object,
    default: null,
  },
  selectedCropPlanPlacedCount: {
    type: Number,
    required: true,
  },
  selectedCropPlanRemainingCount: {
    type: Number,
    required: true,
  },
  cropPlanMethodOptions: {
    type: Array,
    required: true,
  },
  plantingLayoutMode: {
    type: String,
    required: true,
  },
  plantingMode: {
    type: String,
    required: true,
  },
  freePlacementSnap: {
    type: Boolean,
    required: true,
  },
  freePlacementConflictCount: {
    type: Number,
    required: true,
  },
  freePlacementBoundaryCount: {
    type: Number,
    required: true,
  },
  plantingSummary: {
    type: Array,
    required: true,
  },
  cropPlans: {
    type: Array,
    required: true,
  },
  workspaceMode: {
    type: String,
    required: true,
  },
  guidedTransplantRequest: {
    type: Object,
    default: null,
  },
  guidedTransplantPlacedCount: {
    type: Number,
    required: true,
  },
  guidedSuggestedPlantings: {
    type: Array,
    required: true,
  },
  plantingPreviewLayout: {
    type: Object,
    required: true,
  },
  plantingPoints: {
    type: Array,
    required: true,
  },
  hoveredPlantingPoint: {
    type: Object,
    default: null,
  },
  previewPlantings: {
    type: Array,
    required: true,
  },
  selectedPreviewPlanting: {
    type: Object,
    default: null,
  },
  selectedPreviewPlantingId: {
    type: String,
    default: null,
  },
  activePlantingId: {
    type: String,
    default: null,
  },
  previewDragState: {
    type: Object,
    required: true,
  },
  getBedTypeMeta: {
    type: Function,
    required: true,
  },
  getPointKey: {
    type: Function,
    required: true,
  },
  feetToPixels: {
    type: Function,
    required: true,
  },
  getPreviewPointFill: {
    type: Function,
    required: true,
  },
  getPreviewPointStroke: {
    type: Function,
    required: true,
  },
  plantingHasConflict: {
    type: Function,
    required: true,
  },
  plantingHasBoundaryConflict: {
    type: Function,
    required: true,
  },
  getPlantSpacingRadiusFeet: {
    type: Function,
    required: true,
  },
  getPlantColor: {
    type: Function,
    required: true,
  },
  getPlantShortLabel: {
    type: Function,
    required: true,
  },
})

defineEmits([
  'update:modelValue',
  'update:selectedPlantId',
  'update:selectedCropPlanMethod',
  'update:selectedCropPlanTargetQuantity',
  'update:selectedCropPlanNotes',
  'place-planned',
  'place-guided-suggested',
  'update:plantingLayoutMode',
  'update:plantingMode',
  'update:freePlacementSnap',
  'finish-guided-transplant',
  'fill-all',
  'clear-area',
  'delete-selected-plant',
  'preview-pointerdown',
  'preview-pointermove',
  'preview-pointerup',
  'preview-pointerleave',
  'close',
])
</script>

<style scoped>
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
  flex-wrap: wrap;
}

.planting-dialog__guide {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: #eef6eb;
  border: 1px solid #d5e5cf;
}

.planting-dialog__guide-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #2f412b;
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

.planting-dialog__plans {
  display: grid;
  gap: 6px;
  padding-top: 2px;
}

.planting-dialog__plans-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #607259;
}

.planting-dialog__plan-editor {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 252, 244, 0.72);
  border: 1px solid rgba(78, 101, 72, 0.12);
}

.planting-dialog__plan-stat {
  display: grid;
  gap: 2px;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(99, 126, 90, 0.08);
}

.planting-dialog__plan-stat-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #607259;
}

.planting-dialog__plan-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #2f412b;
}

.planting-dialog__plan-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #455641;
}

.planting-dialog__plan-name {
  font-weight: 600;
}

.planting-dialog__plan-meta {
  color: #6a7d63;
}

.planting-dialog__plan-method {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(99, 126, 90, 0.12);
  color: #42553d;
  font-size: 11px;
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

.planting-preview__blueprint {
  fill: rgba(88, 148, 255, 0.14);
  stroke: rgba(88, 148, 255, 0.95);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.planting-preview__blueprint-label {
  fill: rgba(51, 102, 204, 0.92);
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

.planting-preview__menu-delete-icon {
  fill: none;
  stroke: #a11e25;
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
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
