<template>
  <q-icon
    v-if="name"
    :name="name"
    :size="normalizedSize"
    class="garden-ui-icon"
  />

  <svg
    v-else
    class="garden-ui-icon"
    :style="{ width: normalizedSize, height: normalizedSize, color }"
    :viewBox="viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      v-for="(path, index) in paths"
      :key="`${index}-${path.d}`"
      :d="path.d"
      :fill="path.fill ?? 'none'"
      :stroke="path.stroke ?? 'currentColor'"
      :stroke-dasharray="path.strokeDasharray"
      :stroke-linecap="path.strokeLinecap ?? 'round'"
      :stroke-linejoin="path.strokeLinejoin ?? 'round'"
      :stroke-width="path.strokeWidth ?? strokeWidth"
    />
  </svg>
</template>

<script setup>
const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  paths: {
    type: Array,
    default: () => [],
  },
  size: {
    type: [Number, String],
    default: 18,
  },
  viewBox: {
    type: String,
    default: '0 0 24 24',
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.8,
  },
  color: {
    type: String,
    default: 'currentColor',
  },
})

const normalizedSize = typeof props.size === 'number' ? `${props.size}px` : props.size
</script>

<style scoped>
.garden-ui-icon {
  display: block;
  flex: 0 0 auto;
}
</style>
