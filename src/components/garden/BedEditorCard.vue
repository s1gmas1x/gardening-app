<template>
  <q-card
    flat
    bordered
    class="bed-editor"
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
            class="bed-editor__name"
            @update:model-value="$emit('update-name', $event)"
          />
          <div class="bed-editor__meta">
            {{ selectedBed.xFeet.toFixed(1) }} x {{ selectedBed.yFeet.toFixed(1) }} ft
            <span v-if="supportsSelectedBedHeight"> · {{ selectedBed.bedHeightInches }} in tall</span>
          </div>
        </div>

        <div class="bed-editor__actions">
          <q-btn round dense flat icon="rotate_90_degrees_cw" @click="$emit('rotate')">
            <q-tooltip>Rotate 90°</q-tooltip>
          </q-btn>
          <q-btn round dense flat icon="close" @click="$emit('close')">
            <q-tooltip>Close</q-tooltip>
          </q-btn>
          <q-btn round dense flat color="negative" icon="delete" @click="$emit('delete')">
            <q-tooltip>Delete</q-tooltip>
          </q-btn>
        </div>
      </div>

      <q-select
        :model-value="selectedBed.type"
        :options="bedTypeSelectOptions"
        dense
        outlined
        emit-value
        map-options
        options-dense
        label="Growing Zone Type"
        class="bed-editor__type-select"
        @update:model-value="$emit('update-type', $event)"
      />

      <div class="bed-editor__stats">
        <q-input
          :model-value="selectedBed.widthFeet"
          type="number"
          min="1"
          step="0.5"
          dense
          outlined
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
          label="Depth"
          suffix="in"
          class="bed-editor__field"
          @update:model-value="$emit('update-height', Number($event))"
        />
      </div>

      <div class="bed-editor__footer">
        Grid reads in feet, then opens into inches as you zoom closer.
      </div>

      <q-btn color="positive" unelevated icon="eco" label="Plan This Zone" @click="$emit('plant')" />
    </q-card-section>
  </q-card>
</template>

<script setup>
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
  styleObject: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits([
  'update-name',
  'update-type',
  'update-width',
  'update-length',
  'update-height',
  'rotate',
  'close',
  'delete',
  'plant',
])
</script>

<style scoped>
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
</style>
