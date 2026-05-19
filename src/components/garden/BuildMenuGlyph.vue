<template>
  <svg
    class="build-menu-glyph"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <g v-if="kind === 'planting_areas'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <path d="M4 18H20" />
      <path d="M6 18V14H18V18" />
      <path d="M12 6V13" />
      <path d="M12 6C12 4.6 13.1 3.5 14.5 3.5C14.5 4.9 13.4 6 12 6Z" fill="currentColor" stroke="none" />
      <path d="M12 8C12 6.6 10.9 5.5 9.5 5.5C9.5 6.9 10.6 8 12 8Z" fill="currentColor" stroke="none" />
    </g>

    <g v-else-if="kind === 'structures'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <path d="M5 18V10L12 5L19 10V18" />
      <path d="M8 18V12H16V18" />
      <path d="M10 9H14" />
    </g>

    <g v-else-if="kind === 'landmarks'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <path d="M6 18H18" />
      <path d="M8 18V8" />
      <path d="M16 18V8" />
      <path d="M8 8H16" />
      <path d="M12 4L15 8H9L12 4Z" fill="currentColor" stroke="none" />
    </g>

    <g v-else-if="kind === 'raised'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <rect x="4.5" y="7" width="15" height="10" rx="2.5" />
      <rect x="7" y="9.5" width="10" height="5" rx="1.5" />
    </g>

    <g v-else-if="kind === 'regular'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <rect x="4.5" y="7" width="15" height="10" rx="2.5" stroke-dasharray="2.5 2.5" />
      <path d="M8 10H16" />
      <path d="M8 13H14" />
    </g>

    <g v-else-if="kind === 'pot'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <path d="M7 9H17L15.5 18H8.5L7 9Z" />
      <path d="M6 7H18" />
      <path d="M10 12C10.6 10.8 11.7 10 13 10" />
    </g>

    <g v-else-if="kind === 'greenhouse'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <path d="M5 18V10L12 5L19 10V18" />
      <path d="M12 5V18" />
      <path d="M8.5 12H15.5" />
    </g>

    <g v-else-if="kind === 'hoophouse'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <path d="M4 18C4 10.8 7.6 6 12 6C16.4 6 20 10.8 20 18" />
      <path d="M6.5 18V14.5" />
      <path d="M12 18V10" />
      <path d="M17.5 18V14.5" />
      <path d="M4 18H20" />
    </g>

    <g v-else-if="kind === 'entrance'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <circle cx="7" cy="9" r="1.8" />
      <circle cx="17" cy="9" r="1.8" />
      <path d="M12 9V18" />
      <path d="M9 15L12 18L15 15" />
    </g>

    <g v-else-if="kind === 'fence'" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <path d="M4 18H20" />
      <path d="M6 18V8" />
      <path d="M10 18V6" />
      <path d="M14 18V8" />
      <path d="M18 18V6" />
      <path d="M6 8L8 6L10 8" />
      <path d="M14 8L16 6L18 8" />
    </g>

    <g v-else stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">
      <circle cx="12" cy="12" r="7" />
      <path d="M9 12H15" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  kind: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
.build-menu-glyph {
  width: 18px;
  height: 18px;
  display: block;
  flex: 0 0 auto;
}
</style>
