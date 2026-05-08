<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="garden-dimensions-dialog">
      <q-card-section class="row items-start justify-between q-col-gutter-md">
        <div class="col">
          <div class="text-subtitle1 text-weight-medium">Garden Footprint</div>
          <div class="text-caption text-grey-7">
            Reshape the garden footprint without losing the rest of the season plan.
          </div>
        </div>

        <div class="col-auto">
          <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-input
              :model-value="widthFeet"
              type="number"
              min="1"
              step="1"
              outlined
              label="Width"
              suffix="ft"
              @update:model-value="$emit('update:widthFeet', $event)"
            />
          </div>

          <div class="col-6">
            <q-input
              :model-value="lengthFeet"
              type="number"
              min="1"
              step="1"
              outlined
              label="Length"
              suffix="ft"
              @update:model-value="$emit('update:lengthFeet', $event)"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="between" class="q-px-md q-pb-md">
        <q-btn flat label="Reset Garden" @click="$emit('start-over')" />
        <div class="row q-gutter-sm">
          <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" />
          <q-btn color="positive" unelevated label="Update Footprint" @click="$emit('apply')" />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  widthFeet: {
    type: Number,
    required: true,
  },
  lengthFeet: {
    type: Number,
    required: true,
  },
})

defineEmits([
  'update:modelValue',
  'update:widthFeet',
  'update:lengthFeet',
  'apply',
  'start-over',
])
</script>

<style scoped>
.garden-dimensions-dialog {
  width: min(92vw, 460px);
  border-radius: 24px;
}
</style>
