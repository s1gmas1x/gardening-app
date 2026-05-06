<template>
  <router-view />
</template>

<script setup>
import { watch } from 'vue'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlanningStore } from 'src/stores/planning-store'
import { useScheduleStore } from 'src/stores/schedule-store'

const gardenStore = useGardenStore()
const planningStore = usePlanningStore()
const scheduleStore = useScheduleStore()

gardenStore.initializePersistence()
planningStore.initializePersistence()
scheduleStore.initializePersistence()

watch(
  () => gardenStore.beds.map((bed) => bed.id),
  (bedIds) => {
    planningStore.prunePlantingsForAreaIds(bedIds)
  },
  { immediate: true },
)
</script>
