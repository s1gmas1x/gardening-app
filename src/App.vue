<template>
  <router-view />
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlantStore } from 'src/stores/plant-store'
import { usePlanningStore } from 'src/stores/planning-store'
import { usePropagationStore } from 'src/stores/propagation-store'
import { useScheduleStore } from 'src/stores/schedule-store'

const gardenStore = useGardenStore()
const plantStore = usePlantStore()
const planningStore = usePlanningStore()
const propagationStore = usePropagationStore()
const scheduleStore = useScheduleStore()

plantStore.initializeCatalog()
gardenStore.initializePersistence()
planningStore.initializePersistence()
propagationStore.initializePersistence()
scheduleStore.initializePersistence()

const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000
let weatherRefreshIntervalId = null

function syncWeatherIfStale() {
  scheduleStore.refreshWeatherIfStale().catch(() => {})
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    syncWeatherIfStale()
  }
}

onMounted(() => {
  syncWeatherIfStale()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  weatherRefreshIntervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      syncWeatherIfStale()
    }
  }, WEATHER_REFRESH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  if (weatherRefreshIntervalId !== null) {
    window.clearInterval(weatherRefreshIntervalId)
    weatherRefreshIntervalId = null
  }
})

watch(
  () => gardenStore.beds.map((bed) => bed.id),
  (bedIds) => {
    planningStore.prunePlantingsForAreaIds(bedIds)
  },
  { immediate: true },
)

watch(
  () => scheduleStore.plantingTasks.map((task) => task.id),
  (taskIds) => {
    scheduleStore.pruneTaskStatus(taskIds)
  },
  { immediate: true },
)

watch(
  () => scheduleStore.plantingBatches.map((batch) => batch.id),
  (batchIds) => {
    propagationStore.pruneAssignments(batchIds)
  },
  { immediate: true },
)
</script>
