<template>
  <router-view />
</template>

<script setup>
import { watch } from 'vue'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlanningStore } from 'src/stores/planning-store'
import { usePropagationStore } from 'src/stores/propagation-store'
import { useScheduleStore } from 'src/stores/schedule-store'

const gardenStore = useGardenStore()
const planningStore = usePlanningStore()
const propagationStore = usePropagationStore()
const scheduleStore = useScheduleStore()

gardenStore.initializePersistence()
planningStore.initializePersistence()
propagationStore.initializePersistence()
scheduleStore.initializePersistence()

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
