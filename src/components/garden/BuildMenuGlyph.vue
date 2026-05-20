<template>
  <GardenUiIcon
    v-if="kind === 'planting_areas'"
    class="build-menu-glyph"
    :paths="plantingAreasGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'structures'"
    class="build-menu-glyph"
    :paths="structuresGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'landmarks'"
    class="build-menu-glyph"
    :paths="landmarksGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'raised'"
    class="build-menu-glyph"
    :paths="raisedGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'regular'"
    class="build-menu-glyph"
    :paths="regularGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'pot'"
    class="build-menu-glyph"
    :paths="potGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'greenhouse'"
    class="build-menu-glyph"
    :paths="greenhouseGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'hoophouse'"
    class="build-menu-glyph"
    :paths="hoophouseGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'entrance'"
    class="build-menu-glyph"
    :paths="entranceGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <GardenUiIcon
    v-else-if="kind === 'fence'"
    class="build-menu-glyph"
    :paths="fenceGlyphPaths"
    size="18px"
    stroke-width="1.7"
  />

  <svg
    v-else
    class="build-menu-glyph"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >

    <g v-if="true" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <circle cx="12" cy="12" r="7" />
      <path d="M9 12H15" />
    </g>
  </svg>
</template>

<script setup>
import GardenUiIcon from 'src/components/garden/GardenUiIcon.vue'

defineProps({
  kind: {
    type: String,
    required: true,
  },
})

const plantingAreasGlyphPaths = [
  { d: 'M4 18H20' },
  { d: 'M6 18V14H18V18' },
  { d: 'M12 6V13' },
  { d: 'M12 6C12 4.6 13.1 3.5 14.5 3.5C14.5 4.9 13.4 6 12 6Z', fill: 'currentColor', stroke: 'none' },
  { d: 'M12 8C12 6.6 10.9 5.5 9.5 5.5C9.5 6.9 10.6 8 12 8Z', fill: 'currentColor', stroke: 'none' },
]
const structuresGlyphPaths = [
  { d: 'M5 18V10L12 5L19 10V18' },
  { d: 'M8 18V12H16V18' },
  { d: 'M10 9H14' },
]
const landmarksGlyphPaths = [
  { d: 'M6 18H18' },
  { d: 'M8 18V8' },
  { d: 'M16 18V8' },
  { d: 'M8 8H16' },
  { d: 'M12 4L15 8H9L12 4Z', fill: 'currentColor', stroke: 'none' },
]
const raisedGlyphPaths = [
  { d: 'M7 9.5H17C17.8284 9.5 18.5 10.1716 18.5 11V15.5C18.5 16.3284 17.8284 17 17 17H7C6.17157 17 5.5 16.3284 5.5 15.5V11C5.5 10.1716 6.17157 9.5 7 9.5Z' },
  { d: 'M7 9.5H17C18.3807 9.5 19.5 8.38071 19.5 7C19.5 5.61929 18.3807 4.5 17 4.5H7C5.61929 4.5 4.5 5.61929 4.5 7C4.5 8.38071 5.61929 9.5 7 9.5Z' },
]
const regularGlyphPaths = [
  { d: 'M7 17H17C18.3807 17 19.5 15.8807 19.5 14.5V9.5C19.5 8.11929 18.3807 7 17 7H7C5.61929 7 4.5 8.11929 4.5 9.5V14.5C4.5 15.8807 5.61929 17 7 17Z', strokeDasharray: '2.5 2.5' },
  { d: 'M8 10H16' },
  { d: 'M8 13H14' },
]
const potGlyphPaths = [
  { d: 'M7 9H17L15.5 18H8.5L7 9Z' },
  { d: 'M6 7H18' },
  { d: 'M10 12C10.6 10.8 11.7 10 13 10' },
]
const greenhouseGlyphPaths = [
  { d: 'M5 18V10L12 5L19 10V18' },
  { d: 'M12 5V18' },
  { d: 'M8.5 12H15.5' },
]
const hoophouseGlyphPaths = [
  { d: 'M4 18C4 10.8 7.6 6 12 6C16.4 6 20 10.8 20 18' },
  { d: 'M6.5 18V14.5' },
  { d: 'M12 18V10' },
  { d: 'M17.5 18V14.5' },
  { d: 'M4 18H20' },
]
const entranceGlyphPaths = [
  { d: 'M12 9V18' },
  { d: 'M9 15L12 18L15 15' },
  { d: 'M7 10.8C7.99411 10.8 8.8 9.99411 8.8 9C8.8 8.00589 7.99411 7.2 7 7.2C6.00589 7.2 5.2 8.00589 5.2 9C5.2 9.99411 6.00589 10.8 7 10.8Z' },
  { d: 'M17 10.8C17.9941 10.8 18.8 9.99411 18.8 9C18.8 8.00589 17.9941 7.2 17 7.2C16.0059 7.2 15.2 8.00589 15.2 9C15.2 9.99411 16.0059 10.8 17 10.8Z' },
]
const fenceGlyphPaths = [
  { d: 'M4 18H20' },
  { d: 'M6 18V8' },
  { d: 'M10 18V6' },
  { d: 'M14 18V8' },
  { d: 'M18 18V6' },
  { d: 'M6 8L8 6L10 8' },
  { d: 'M14 8L16 6L18 8' },
]
</script>

<style scoped>
.build-menu-glyph {
  width: 18px;
  height: 18px;
  display: block;
  flex: 0 0 auto;
}
</style>
