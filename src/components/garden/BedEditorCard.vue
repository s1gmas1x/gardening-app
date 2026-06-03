<template>
  <q-card
    flat
    bordered
    class="bed-editor"
    :class="{ 'bed-editor--sheet': sheetMode }"
    :style="styleObject"
    @pointerdown.stop
    @click.stop
  >
    <q-card-section class="bed-editor__section">
      <div class="bed-editor__header">
        <div class="bed-editor__title-block">
          <div class="bed-editor__eyebrow">{{ typeLabel }}</div>
          <q-input
            :model-value="selectedBed.name"
            dense
            borderless
            :readonly="!allowLayoutEditing"
            class="bed-editor__name"
            @update:model-value="$emit('update-name', $event)"
          />
          <div class="bed-editor__meta">
            {{ selectedBed.widthFeet.toFixed(1) }} x {{ selectedBed.heightFeet.toFixed(1) }} ft
            <span v-if="supportsSelectedBedHeight"> · {{ selectedBed.bedHeightInches }} in tall</span>
          </div>
        </div>

        <div class="bed-editor__actions">
          <q-btn
            v-if="allowLayoutEditing"
            round
            dense
            unelevated
            color="white"
            text-color="grey-8"
            size="12px"
            class="bed-editor__action-btn"
            @click="$emit('toggle-lock')"
          >
            <GardenUiIcon
              :paths="selectedBed.locked ? lockIconPaths : unlockIconPaths"
              size="26px"
              color="currentColor"
            />
            <q-tooltip>{{ selectedBed.locked ? 'Unlock zone' : 'Lock zone' }}</q-tooltip>
          </q-btn>
          <q-btn
            v-if="allowLayoutEditing"
            round
            dense
            unelevated
            color="white"
            text-color="grey-8"
            size="12px"
            class="bed-editor__action-btn"
            :disable="selectedBed.locked"
            @click="$emit('rotate')"
          >
            <GardenUiIcon
              :paths="rotateIconPaths"
              size="26px"
              color="currentColor"
            />
            <q-tooltip>{{ selectedBed.locked ? 'Unlock zone to rotate' : 'Rotate 90°' }}</q-tooltip>
          </q-btn>
          <q-btn
            round
            dense
            unelevated
            color="white"
            text-color="grey-8"
            size="12px"
            class="bed-editor__action-btn"
            @click="$emit('close')"
          >
            <GardenUiIcon
              :paths="closeIconPaths"
              size="24px"
              color="currentColor"
            />
            <q-tooltip>Close</q-tooltip>
          </q-btn>
          <q-btn
            v-if="allowLayoutEditing"
            round
            dense
            unelevated
            color="negative"
            text-color="white"
            size="12px"
            class="bed-editor__action-btn"
            @click="$emit('delete')"
          >
            <GardenUiIcon
              :paths="deleteIconPaths"
              size="26px"
              color="currentColor"
            />
            <q-tooltip>Delete</q-tooltip>
          </q-btn>
        </div>
      </div>

      <q-select
        v-if="allowLayoutEditing"
        :model-value="selectedBed.type"
        :options="bedTypeSelectOptions"
        dense
        outlined
        emit-value
        map-options
        options-dense
        :disable="selectedBed.locked"
        label="Growing Zone Type"
        class="bed-editor__type-select"
        @update:model-value="$emit('update-type', $event)"
      />

      <div v-if="allowLayoutEditing" class="bed-editor__stats">
        <q-input
          :model-value="selectedBed.widthFeet"
          type="number"
          min="1"
          step="0.5"
          dense
          outlined
          :disable="selectedBed.locked"
          label="Width"
          suffix="ft"
          class="bed-editor__field"
          @update:model-value="$emit('update-width', Number($event))"
        />

        <q-input
          :model-value="selectedBed.heightFeet"
          type="number"
          min="1"
          step="0.5"
          dense
          outlined
          :disable="selectedBed.locked"
          label="Length"
          suffix="ft"
          class="bed-editor__field"
          @update:model-value="$emit('update-length', Number($event))"
        />

        <q-input
          v-if="supportsSelectedBedHeight"
          :model-value="selectedBed.bedHeightInches"
          type="number"
          min="1"
          max="96"
          step="1"
          dense
          outlined
          :disable="selectedBed.locked"
          label="Depth"
          suffix="in"
          class="bed-editor__field"
          @update:model-value="$emit('update-height', Number($event))"
        />
      </div>

      <div class="bed-editor__footer">
        Grid reads in feet, then opens into inches as you zoom closer.
      </div>

      <q-btn
        v-if="showPlantAction"
        color="positive"
        unelevated
        icon="eco"
        :label="plantActionLabel"
        @click="$emit('plant')"
      />
    </q-card-section>
  </q-card>
</template>

<script setup>
import GardenUiIcon from './GardenUiIcon.vue'

defineProps({
  selectedBed: {
    type: Object,
    required: true,
  },
  supportsSelectedBedHeight: {
    type: Boolean,
    required: true,
  },
  typeLabel: {
    type: String,
    required: true,
  },
  bedTypeSelectOptions: {
    type: Array,
    required: true,
  },
  allowLayoutEditing: {
    type: Boolean,
    default: true,
  },
  styleObject: {
    type: Object,
    default: () => ({}),
  },
  sheetMode: {
    type: Boolean,
    default: false,
  },
  showPlantAction: {
    type: Boolean,
    default: true,
  },
  plantActionLabel: {
    type: String,
    default: 'Plan This Zone',
  },
})

defineEmits([
  'update-name',
  'update-type',
  'update-width',
  'update-length',
  'update-height',
  'rotate',
  'toggle-lock',
  'close',
  'delete',
  'plant',
])

const lockIconPaths = [
  { d: 'M8 11V8.75C8 6.68 9.79 5 12 5C14.21 5 16 6.68 16 8.75V11', strokeWidth: 1.9 },
  { d: 'M7.5 11.25H16.5V18H7.5Z', strokeWidth: 1.9, strokeLinejoin: 'round' },
  { d: 'M12 13.7V15.75', strokeWidth: 1.9 },
]

const unlockIconPaths = [
  { d: 'M8 11V8.85C8 6.72 9.79 5 12 5C13.63 5 15.02 5.92 15.63 7.25', strokeWidth: 1.9 },
  { d: 'M7.5 11.25H16.5V18H7.5Z', strokeWidth: 1.9, strokeLinejoin: 'round' },
  { d: 'M12 13.7V15.75', strokeWidth: 1.9 },
]

const rotateIconPaths = [
  { d: 'M8.15 9.15A5.25 5.25 0 1 1 8.3 15.05', strokeWidth: 1.9 },
  { d: 'M8.05 5.95V9.55H11.65', strokeWidth: 1.9 },
]

const closeIconPaths = [
  { d: 'M7.5 7.5L16.5 16.5', strokeWidth: 2.1 },
  { d: 'M16.5 7.5L7.5 16.5', strokeWidth: 2.1 },
]

const deleteIconPaths = [
  { d: 'M8.5 8.75H15.5', strokeWidth: 1.9 },
  { d: 'M9.25 8.75V16.75', strokeWidth: 1.9 },
  { d: 'M12 8.75V16.75', strokeWidth: 1.9 },
  { d: 'M14.75 8.75V16.75', strokeWidth: 1.9 },
  { d: 'M7.75 6.5H16.25', strokeWidth: 1.9 },
  { d: 'M10.25 6.5V5.5H13.75V6.5', strokeWidth: 1.9 },
  { d: 'M8.5 8.75L8.95 18H15.05L15.5 8.75', strokeWidth: 1.9, strokeLinejoin: 'round' },
]
</script>

<style scoped>
.bed-editor {
  position: relative;
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
  gap: 6px;
}

.bed-editor__action-btn {
  box-shadow: 0 8px 18px rgba(37, 51, 34, 0.08);
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

.bed-editor--sheet {
  position: static;
  width: 100%;
  border-radius: 26px 26px 0 0;
  background: rgba(255, 252, 244, 0.98);
  box-shadow: none;
  border-bottom: 0;
}

.bed-editor--sheet .bed-editor__section {
  padding: 18px 16px 22px;
  gap: 14px;
}

@media (max-width: 680px) {
  .bed-editor__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bed-editor--sheet .bed-editor__stats {
    grid-template-columns: 1fr;
  }
}
</style>
