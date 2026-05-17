<template>
  <div class="simulation-palette">
    <div class="simulation-palette__stack">
      <div class="simulation-palette__cluster">
        <q-btn
          v-for="tool in primaryTools"
          :key="tool.value"
          round
          unelevated
          size="15px"
          :icon="tool.icon"
          :color="activeTool === tool.value ? accentColor : 'white'"
          :text-color="activeTool === tool.value ? 'white' : 'grey-8'"
          class="simulation-palette__btn"
          @click="$emit('change-tool', tool.value)"
        >
          <q-tooltip>{{ tool.label }}</q-tooltip>
        </q-btn>
      </div>

      <q-fab
        v-if="addOptions.length"
        :color="accentColor"
        text-color="white"
        icon="add_circle"
        active-icon="close"
        direction="up"
        unelevated
        class="simulation-palette__fab"
      >
        <q-fab-action
          v-for="option in addOptions"
          :key="option.type"
          color="white"
          text-color="grey-8"
          :icon="option.icon"
          @click="emitAdd(option.type)"
        >
          <q-tooltip anchor="center left" self="center right">{{ option.label }}</q-tooltip>
        </q-fab-action>
      </q-fab>

      <div class="simulation-palette__cluster">
        <q-btn
          round
          unelevated
          size="15px"
          icon="remove"
          color="white"
          text-color="grey-8"
          class="simulation-palette__btn"
          @click="$emit('zoom-out')"
        >
          <q-tooltip>Zoom out</q-tooltip>
        </q-btn>

        <div class="simulation-palette__zoom">
          {{ Math.round(zoom * 100) }}%
        </div>

        <q-btn
          round
          unelevated
          size="15px"
          icon="add"
          color="white"
          text-color="grey-8"
          class="simulation-palette__btn"
          @click="$emit('zoom-in')"
        >
          <q-tooltip>Zoom in</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeTool: {
    type: String,
    required: true,
  },
  zoom: {
    type: Number,
    required: true,
  },
  primaryTools: {
    type: Array,
    default: () => [],
  },
  addOptions: {
    type: Array,
    default: () => [],
  },
  accentColor: {
    type: String,
    default: 'positive',
  },
})

const emit = defineEmits(['change-tool', 'zoom-in', 'zoom-out', 'add-bed'])

function emitAdd(type) {
  emit('change-tool', 'add')
  emit('add-bed', type)
}
</script>

<style scoped>
.simulation-palette {
  position: absolute;
  right: 12px;
  bottom: 14px;
  z-index: 5;
}

.simulation-palette__stack {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.simulation-palette__cluster {
  display: grid;
  gap: 8px;
  justify-items: end;
  padding: 8px;
  border-radius: 22px;
  background: rgba(255, 252, 244, 0.82);
  box-shadow: 0 14px 32px rgba(37, 51, 34, 0.14);
  backdrop-filter: blur(12px);
}

.simulation-palette__btn,
.simulation-palette__fab :deep(.q-btn) {
  min-width: 48px;
  min-height: 48px;
  box-shadow: 0 8px 18px rgba(37, 51, 34, 0.14);
}

.simulation-palette__zoom {
  min-width: 60px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #455641;
  text-align: center;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.simulation-palette__fab :deep(.q-fab__actions) {
  gap: 8px;
}
</style>
