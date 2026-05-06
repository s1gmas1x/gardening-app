<template>
  <q-page class="planner-page">
    <div class="planner-shell q-pa-md q-pa-lg-xl">
      <section v-if="!gardenStore.isInitialized" class="hero-copy q-mb-lg">
        <div class="text-overline text-positive">Garden Planner</div>
        <h1 class="hero-title q-my-sm">Build the planner on a clean model, not on canvas-side state.</h1>
        <p class="hero-body q-mb-none">
          This first pass carries over the useful parts of the old prototype: garden dimensions,
          movable raised beds, zoom-sensitive grid detail, and a viewport you can pan around.
        </p>
      </section>

      <GardenSetupForm v-if="!gardenStore.isInitialized" @submit="initializeGarden" />

      <div v-else class="column q-gutter-md">
        <section class="planner-header row items-end justify-between q-col-gutter-md">
          <div class="col">
            <div class="text-overline text-positive">Garden Planner</div>
            <div class="planner-header__title">Plan the space directly on the canvas.</div>
          </div>

          <div class="col-auto planner-header__meta">
            {{ gardenStore.widthFeet }} x {{ gardenStore.lengthFeet }} ft
          </div>
        </section>

        <GardenToolbar
          :interaction-mode="gardenStore.interactionMode"
          :width-feet="gardenStore.widthFeet"
          :length-feet="gardenStore.lengthFeet"
          :bed-count="gardenStore.beds.length"
          :zoom="gardenStore.viewport.zoom"
          @add-bed="addArea"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @change-mode="gardenStore.setInteractionMode"
          @edit-garden-size="isGardenDimensionsOpen = true"
        />

        <GardenCanvas />

        <ScheduleSettingsCard
          :zip-code="scheduleStore.zipCode"
          :location-name="scheduleStore.locationName"
          :state-code="scheduleStore.stateCode"
          :latitude="scheduleStore.latitude"
          :longitude="scheduleStore.longitude"
          :zip-lookup-pending="scheduleStore.zipLookupPending"
          :zip-lookup-error="scheduleStore.zipLookupError"
          :suggested-frost-dates="scheduleStore.suggestedFrostDates"
          :frost-suggestion-pending="scheduleStore.frostSuggestionPending"
          :frost-suggestion-error="scheduleStore.frostSuggestionError"
          :last-frost-date="scheduleStore.lastFrostDate"
          :first-frost-date="scheduleStore.firstFrostDate"
          @update:zip-code="scheduleStore.updateScheduleSettings({ zipCode: $event })"
          @update:last-frost-date="scheduleStore.updateScheduleSettings({ lastFrostDate: $event })"
          @update:first-frost-date="scheduleStore.updateScheduleSettings({ firstFrostDate: $event })"
          @lookup-zip="scheduleStore.lookupZipCode()"
          @suggest-frost-dates="scheduleStore.suggestFrostDates()"
          @apply-suggested-frost-dates="scheduleStore.applySuggestedFrostDates()"
        />

        <PlannerTaskList
          :tasks="plannerTasks"
          :completed-count="completedTaskCount"
          @toggle-task="scheduleStore.setTaskDone($event.taskId, $event.done)"
          @focus-task="focusTaskArea"
          @mark-transplanted="markTaskTransplanted"
        />

        <PlantingCalendarCard
          :tasks="plannerTasks"
          @focus-task="focusTaskArea"
        />

        <PropagationTrayBoard
          :demands="trayDemands"
          :trays="traySummaries"
          :tray-options="propagationStore.trayOptions"
          :tray-status-options="TRAY_STATUS_OPTIONS"
          :assignment-status-options="ASSIGNMENT_STATUS_OPTIONS"
          @create-tray="propagationStore.createTray($event)"
          @assign-demand="propagationStore.assignCropPlanToTray($event.cropPlanId, $event.trayId, $event.cellCount)"
          @quick-assign-new-tray="quickAssignDemandToNewTray"
          @remove-assignment="propagationStore.removeAssignment($event)"
          @update-tray-status="propagationStore.updateTrayStatus($event.trayId, $event.status)"
          @update-assignment-status="propagationStore.updateAssignmentStatus($event.assignmentId, $event.status)"
        />

        <GardenDimensionsDialog
          v-model="isGardenDimensionsOpen"
          :width-feet="dimensions.widthFeet"
          :length-feet="dimensions.lengthFeet"
          @update:width-feet="dimensions.widthFeet = Number($event)"
          @update:length-feet="dimensions.lengthFeet = Number($event)"
          @apply="applyDimensions"
          @start-over="startOver"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import GardenCanvas from 'src/components/garden/GardenCanvas.vue'
import GardenDimensionsDialog from 'src/components/garden/GardenDimensionsDialog.vue'
import PropagationTrayBoard from 'src/components/garden/PropagationTrayBoard.vue'
import PlannerTaskList from 'src/components/garden/PlannerTaskList.vue'
import PlantingCalendarCard from 'src/components/garden/PlantingCalendarCard.vue'
import ScheduleSettingsCard from 'src/components/garden/ScheduleSettingsCard.vue'
import GardenSetupForm from 'src/components/garden/GardenSetupForm.vue'
import GardenToolbar from 'src/components/garden/GardenToolbar.vue'
import { useGardenStore } from 'src/stores/garden-store'
import {
  ASSIGNMENT_STATUS_OPTIONS,
  TRAY_STATUS_OPTIONS,
  usePropagationStore,
} from 'src/stores/propagation-store'
import { useScheduleStore } from 'src/stores/schedule-store'

const gardenStore = useGardenStore()
const propagationStore = usePropagationStore()
const scheduleStore = useScheduleStore()
const isGardenDimensionsOpen = ref(false)

const dimensions = reactive({
  widthFeet: gardenStore.widthFeet,
  lengthFeet: gardenStore.lengthFeet,
})

watch(
  () => [gardenStore.widthFeet, gardenStore.lengthFeet],
  ([widthFeet, lengthFeet]) => {
    dimensions.widthFeet = widthFeet
    dimensions.lengthFeet = lengthFeet
  },
)

function initializeGarden({ widthFeet, lengthFeet }) {
  gardenStore.initializeGarden(widthFeet, lengthFeet)
  gardenStore.addBed()
}

function addArea(type) {
  gardenStore.addBed(type)
}

function applyDimensions() {
  gardenStore.updateGardenDimensions(dimensions.widthFeet, dimensions.lengthFeet)
  isGardenDimensionsOpen.value = false
}

function zoomIn() {
  gardenStore.nudgeZoom(1, { x: 320, y: 240 })
}

function zoomOut() {
  gardenStore.nudgeZoom(-1, { x: 320, y: 240 })
}

function startOver() {
  isGardenDimensionsOpen.value = false
  gardenStore.resetGarden()
}

function focusTaskArea(task) {
  if (!task?.areaId) {
    return
  }

  gardenStore.setSelectedBed(task.areaId)
}

function quickAssignDemandToNewTray(demand) {
  const tray = propagationStore.createTray(72)
  propagationStore.assignCropPlanToTray(demand.cropPlanId, tray.id, demand.remainingCells)
}

function markTaskTransplanted(task) {
  if (!task?.cropPlanId) {
    return
  }

  propagationStore.markReadyAssignmentsTransplanted(task.cropPlanId)
  scheduleStore.setTaskDone(task.id, true)
}

const plannerTasks = computed(() => scheduleStore.plantingTasks.map((task) => ({
  ...task,
  taskTypeLabel: task.taskType === 'start_indoors'
    ? 'Start Indoors'
    : task.taskType === 'transplant'
      ? 'Transplant'
      : 'Direct Sow',
  dueDateLabel: task.dueDate
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${task.dueDate}T00:00:00`))
    : '',
})))

const completedTaskCount = computed(() => plannerTasks.value.filter((task) => task.done).length)
const trayDemands = computed(() => propagationStore.indoorStartDemands)
const traySummaries = computed(() => propagationStore.traySummaries)
</script>

<style scoped>
.planner-page {
  background:
    linear-gradient(180deg, #f4f1e6 0%, #eef5ea 100%);
}

.planner-shell {
  max-width: 1440px;
  margin: 0 auto;
}

.hero-copy {
  max-width: 780px;
}

.hero-title {
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: #253322;
}

.hero-body {
  max-width: 720px;
  font-size: 1.05rem;
  color: #51684f;
}

.planner-header__title {
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #253322;
}

.planner-header__meta {
  padding-bottom: 0.2rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: #51684f;
}

</style>
