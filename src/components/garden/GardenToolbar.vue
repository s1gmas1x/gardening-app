<template>
  <q-card flat bordered class="toolbar-card">
    <q-card-section class="row items-center q-col-gutter-sm">
      <div class="col-12 col-md">
        <div class="text-subtitle1 text-weight-medium">Canvas Controls</div>
        <div class="text-caption text-grey-7">
          `{{ widthFeet }} x {{ lengthFeet }} ft` mapped, `{{ bedCount }}` growing zone<span v-if="bedCount !== 1">s</span> in play
        </div>
      </div>

      <div class="col-auto">
        <q-btn-toggle
          :model-value="interactionMode"
          unelevated
          toggle-color="positive"
          color="grey-2"
          text-color="grey-8"
          :options="[
            { label: 'Select', value: 'select' },
            { label: 'Pan', value: 'pan' },
          ]"
          @update:model-value="$emit('change-mode', $event)"
        />
      </div>

      <div class="col-auto">
        <q-btn-dropdown color="positive" unelevated icon="add" label="Place Area">
          <q-list dense>
            <q-item clickable v-close-popup @click="$emit('add-bed', 'regular')">
              <q-item-section>Ground Bed</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="$emit('add-bed', 'raised')">
              <q-item-section>Raised Bed</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="$emit('add-bed', 'pot')">
              <q-item-section>Pot</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <div class="col-auto">
        <q-btn flat icon="straighten" label="Edit Footprint" @click="$emit('edit-garden-size')" />
      </div>

      <div class="col-auto">
        <q-btn flat icon="remove" @click="$emit('zoom-out')">
          <q-tooltip>Zoom out</q-tooltip>
        </q-btn>
      </div>

      <div class="col-auto text-caption text-grey-7">
        {{ Math.round(zoom * 100) }}%
      </div>

      <div class="col-auto">
        <q-btn flat icon="add" @click="$emit('zoom-in')">
          <q-tooltip>Zoom in</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  interactionMode: {
    type: String,
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
  bedCount: {
    type: Number,
    required: true,
  },
  zoom: {
    type: Number,
    required: true,
  },
})

defineEmits(['add-bed', 'zoom-in', 'zoom-out', 'change-mode', 'edit-garden-size'])
</script>

<style scoped>
.toolbar-card {
  border-radius: 20px;
}
</style>
