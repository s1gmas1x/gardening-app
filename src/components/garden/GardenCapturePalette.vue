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
          :color="activeTool === tool.value ? accentColor : 'white'"
          :text-color="activeTool === tool.value ? 'white' : 'grey-8'"
          class="simulation-palette__btn"
          @click="$emit('change-tool', tool.value)"
        >
          <GardenUiIcon
            :name="getToolIconPaths(tool.value) ? '' : tool.icon"
            :paths="getToolIconPaths(tool.value) ?? []"
            size="34px"
            :color="activeTool === tool.value ? '#ffffff' : '#4a5a45'"
          />
          <q-tooltip>{{ tool.label }}</q-tooltip>
        </q-btn>
      </div>

      <div class="simulation-palette__cluster">
        <q-btn
          round
          unelevated
          size="15px"
          color="white"
          text-color="grey-8"
          class="simulation-palette__btn"
          @click="$emit('zoom-out')"
        >
          <GardenUiIcon
            :paths="zoomOutIconPaths"
            size="36px"
            :stroke-width="2"
            color="#4a5a45"
          />
          <q-tooltip>Zoom out</q-tooltip>
        </q-btn>

        <div class="simulation-palette__zoom">
          {{ Math.round(zoom * 100) }}%
        </div>

        <q-btn
          round
          unelevated
          size="15px"
          color="white"
          text-color="grey-8"
          class="simulation-palette__btn"
          @click="$emit('zoom-in')"
        >
          <GardenUiIcon
            :paths="zoomInIconPaths"
            size="36px"
            :stroke-width="2"
            color="#4a5a45"
          />
          <q-tooltip>Zoom in</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import GardenUiIcon from 'src/components/garden/GardenUiIcon.vue'

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
  accentColor: {
    type: String,
    default: 'positive',
  },
})

defineEmits(['change-tool', 'zoom-in', 'zoom-out'])

const toolIconPaths = {
  measure: [
    { d: 'M12 5V8' },
    { d: 'M12 16V19' },
    { d: 'M5 12H8' },
    { d: 'M16 12H19' },
    { d: 'M13.5 13.5L15.5 15.5' },
    { d: 'M9 12H15' },
    { d: 'M12 9V15' },
  ],
  plant: [
    { d: 'M12 8V19' },
    { d: 'M12 9C12 7 13.6 5.4 15.6 5.4C15.6 7.4 14 9 12 9Z', fill: 'currentColor', stroke: 'none' },
    { d: 'M12 11C12 9 10.4 7.4 8.4 7.4C8.4 9.4 10 11 12 11Z', fill: 'currentColor', stroke: 'none' },
    { d: 'M10.2 19H13.8' },
  ],
}

const zoomOutIconPaths = [
  { d: 'M10.5 10.5M6.5 10.5A4 4 0 1 0 14.5 10.5A4 4 0 1 0 6.5 10.5' },
  { d: 'M13.5 13.5L17.5 17.5' },
  { d: 'M8.7 10.5H12.3' },
]

const zoomInIconPaths = [
  { d: 'M10.5 10.5M6.5 10.5A4 4 0 1 0 14.5 10.5A4 4 0 1 0 6.5 10.5' },
  { d: 'M13.5 13.5L17.5 17.5' },
  { d: 'M8.7 10.5H12.3' },
  { d: 'M10.5 8.7V12.3' },
]

function getToolIconPaths(toolValue) {
  return toolIconPaths[toolValue] ?? null
}
</script>

<style scoped>
.simulation-palette {
  position: absolute;
  right: 10px;
  bottom: 12px;
  z-index: 5;
}

.simulation-palette__stack {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.simulation-palette__cluster {
  display: grid;
  gap: 10px;
  justify-items: end;
  padding: 11px 10px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(249, 244, 229, 0.96), rgba(235, 225, 203, 0.9));
  border: 1px solid rgba(95, 110, 84, 0.26);
  box-shadow:
    0 18px 30px rgba(37, 51, 34, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    inset 0 -1px 0 rgba(92, 107, 86, 0.12);
  backdrop-filter: blur(14px);
  position: relative;
}

.simulation-palette__cluster::before {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  top: 6px;
  height: 1px;
  background: rgba(255, 255, 255, 0.55);
}

.simulation-palette__cluster::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 6px;
  height: 1px;
  background: rgba(92, 107, 86, 0.14);
}

.simulation-palette__btn,
.simulation-palette__fab :deep(.q-btn) {
  min-width: 48px;
  min-height: 48px;
  box-shadow:
    0 10px 18px rgba(37, 51, 34, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(97, 111, 86, 0.18);
}

.simulation-palette__zoom {
  min-width: 60px;
  padding: 6px 10px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 234, 220, 0.92));
  color: #42543e;
  text-align: center;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  border: 1px solid rgba(97, 111, 86, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    0 6px 14px rgba(37, 51, 34, 0.12);
}

.simulation-palette__fab :deep(.q-fab__actions) {
  gap: 8px;
}
</style>
