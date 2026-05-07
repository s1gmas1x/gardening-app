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

        <q-card flat bordered class="workspace-tabs-card">
          <q-tabs
            v-model="activeWorkspaceTab"
            align="left"
            active-color="positive"
            indicator-color="positive"
            class="workspace-tabs"
          >
            <q-tab name="plan" icon="edit_note" label="Garden Plan" />
            <q-tab name="current" icon="yard" label="Current Garden" />
          </q-tabs>
        </q-card>

        <q-tab-panels v-model="activeWorkspaceTab" animated class="workspace-panels bg-transparent">
          <q-tab-panel name="plan" class="workspace-panel">
            <div class="column q-gutter-md">
              <GardenCanvas
                :planting-request="activeWorkspaceTab === 'plan' ? plantingDialogRequest : null"
                workspace-mode="plan"
              />

              <GardenPlanOverviewCard
                :areas="plantingOverview"
                :area-count="gardenStore.beds.length"
                :crop-plan-count="plantingOverviewCropPlanCount"
                @focus-area="focusArea"
                @plant-area="openPlantingForArea"
                @plant-crop="openPlantingForCrop"
              />

              <ScheduleSettingsCard
                :zip-code="scheduleStore.zipCode"
                :location-name="scheduleStore.locationName"
                :state-code="scheduleStore.stateCode"
                :latitude="scheduleStore.latitude"
                :longitude="scheduleStore.longitude"
                :usda-zone="scheduleStore.usdaZone"
                :average-last-frost-date="scheduleStore.averageLastFrostDate"
                :average-first-frost-date="scheduleStore.averageFirstFrostDate"
                :growing-zone-meta="growingZoneMeta"
                :growing-zone-error="scheduleStore.growingZoneError"
                :zip-lookup-pending="scheduleStore.zipLookupPending"
                :zip-lookup-error="scheduleStore.zipLookupError"
                :suggested-frost-dates="scheduleStore.suggestedFrostDates"
                :frost-suggestion-pending="scheduleStore.frostSuggestionPending"
                :frost-suggestion-error="scheduleStore.frostSuggestionError"
                :last-frost-date="scheduleStore.lastFrostDate"
                :first-frost-date="scheduleStore.firstFrostDate"
                @update:zip-code="scheduleStore.updateScheduleSettings({ zipCode: $event })"
                @update:usda-zone="scheduleStore.updateScheduleSettings({ usdaZone: $event })"
                @update:average-last-frost-date="scheduleStore.updateScheduleSettings({ averageLastFrostDate: $event })"
                @update:average-first-frost-date="scheduleStore.updateScheduleSettings({ averageFirstFrostDate: $event })"
                @update:last-frost-date="scheduleStore.updateScheduleSettings({ lastFrostDate: $event })"
                @update:first-frost-date="scheduleStore.updateScheduleSettings({ firstFrostDate: $event })"
                @lookup-zip="scheduleStore.lookupZipCode()"
                @suggest-frost-dates="scheduleStore.suggestFrostDates()"
                @apply-suggested-frost-dates="scheduleStore.applySuggestedFrostDates()"
              />

              <WeatherSummaryCard
                :location-display-name="scheduleStore.locationDisplayName"
                :current-conditions="scheduleStore.currentConditions"
                :daily-forecast="scheduleStore.dailyForecast"
                :active-alerts="scheduleStore.activeAlerts"
                :usda-zone="scheduleStore.usdaZone"
                :average-last-frost-date="scheduleStore.averageLastFrostDate"
                :average-first-frost-date="scheduleStore.averageFirstFrostDate"
                :last-updated-at="scheduleStore.lastUpdatedAt"
                :has-freeze-risk="scheduleStore.hasFreezeRisk"
                :has-heat-risk="scheduleStore.hasHeatRisk"
                :has-wind-risk="scheduleStore.hasWindRisk"
                :has-active-weather-alerts="scheduleStore.hasActiveWeatherAlerts"
                :weather-pending="scheduleStore.weatherPending"
                :weather-error="scheduleStore.weatherError"
                :can-refresh="Boolean(scheduleStore.zipCode || (scheduleStore.latitude !== null && scheduleStore.longitude !== null))"
                @refresh-weather="scheduleStore.refreshWeather()"
              />
            </div>
          </q-tab-panel>

          <q-tab-panel name="current" class="workspace-panel">
            <div class="column q-gutter-md">
              <GardenCanvas
                :planting-request="activeWorkspaceTab === 'current' ? plantingDialogRequest : null"
                :guided-transplant-request="activeWorkspaceTab === 'current' ? guidedTransplantRequest : null"
                workspace-mode="current"
                @finish-guided-transplant="finishGuidedTransplant"
                @cancel-guided-transplant="cancelGuidedTransplant"
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
                @assign-demand="propagationStore.assignBatchToTray($event.batchId, $event.trayId, $event.cellCount)"
                @quick-assign-new-tray="quickAssignDemandToNewTray"
                @guided-transplant="startGuidedTransplant"
                @remove-assignment="propagationStore.removeAssignment($event)"
                @update-tray-status="propagationStore.updateTrayStatus($event.trayId, $event.status)"
                @update-assignment-status="propagationStore.updateAssignmentStatus($event.assignmentId, $event.status)"
              />
            </div>
          </q-tab-panel>
        </q-tab-panels>

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
import GardenPlanOverviewCard from 'src/components/garden/GardenPlanOverviewCard.vue'
import PropagationTrayBoard from 'src/components/garden/PropagationTrayBoard.vue'
import PlannerTaskList from 'src/components/garden/PlannerTaskList.vue'
import PlantingCalendarCard from 'src/components/garden/PlantingCalendarCard.vue'
import ScheduleSettingsCard from 'src/components/garden/ScheduleSettingsCard.vue'
import WeatherSummaryCard from 'src/components/garden/WeatherSummaryCard.vue'
import GardenSetupForm from 'src/components/garden/GardenSetupForm.vue'
import GardenToolbar from 'src/components/garden/GardenToolbar.vue'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlantStore } from 'src/stores/plant-store'
import { usePlanningStore } from 'src/stores/planning-store'
import {
  ASSIGNMENT_STATUS_OPTIONS,
  TRAY_STATUS_OPTIONS,
  usePropagationStore,
} from 'src/stores/propagation-store'
import { useScheduleStore } from 'src/stores/schedule-store'

const gardenStore = useGardenStore()
const plantStore = usePlantStore()
const planningStore = usePlanningStore()
const propagationStore = usePropagationStore()
const scheduleStore = useScheduleStore()
const isGardenDimensionsOpen = ref(false)
const plantingDialogRequest = ref(null)
const guidedTransplantRequest = ref(null)
const activeWorkspaceTab = ref('plan')

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

function focusArea(areaId) {
  gardenStore.setSelectedBed(areaId)
}

function queuePlantingDialog(areaId, plantId = null) {
  if (!areaId) {
    return
  }

  gardenStore.setSelectedBed(areaId)
  plantingDialogRequest.value = {
    key: `${areaId}:${plantId ?? 'any'}:${Date.now()}`,
    areaId,
    plantId,
    workspaceMode: 'plan',
  }
}

function openPlantingForArea(areaId) {
  queuePlantingDialog(areaId)
}

function openPlantingForCrop({ areaId, plantId }) {
  queuePlantingDialog(areaId, plantId)
}

function quickAssignDemandToNewTray(demand) {
  const tray = propagationStore.createTray(72)
  propagationStore.assignBatchToTray(demand.batchId, tray.id, demand.remainingCells)
}

function startGuidedTransplant(assignment) {
  if (!assignment?.areaId || !assignment?.plantId || !assignment?.batchId) {
    return
  }

  const initialCurrentCount = planningStore
    .getCurrentPlantingsByAreaId(assignment.areaId)
    .filter((planting) => planting.plantId === assignment.plantId)
    .length

  activeWorkspaceTab.value = 'current'
  gardenStore.setSelectedBed(assignment.areaId)
  guidedTransplantRequest.value = {
    key: `${assignment.batchId}:${assignment.id}:${Date.now()}`,
    assignmentId: assignment.id,
    batchId: assignment.batchId,
    cropPlanId: assignment.cropPlanId,
    areaId: assignment.areaId,
    plantId: assignment.plantId,
    quantity: assignment.cellCount,
    initialCurrentCount,
  }
}

function finishGuidedTransplant(payload) {
  if (!payload?.assignmentId) {
    return
  }

  propagationStore.updateAssignmentStatus(payload.assignmentId, 'transplanted')
  guidedTransplantRequest.value = null
}

function cancelGuidedTransplant() {
  guidedTransplantRequest.value = null
}

function markTaskTransplanted(task) {
  if (!task?.batchId || !task?.cropPlanId) {
    return
  }

  planningStore.incrementInGardenCount(task.cropPlanId, task.quantity)
  propagationStore.markReadyAssignmentsTransplanted(task.batchId)
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
  batchTimingLabel: [
    task.batchStartIndoorDate
      ? `Start ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${task.batchStartIndoorDate}T00:00:00`))}`
      : '',
    task.batchTransplantDate
      ? `Transplant ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${task.batchTransplantDate}T00:00:00`))}`
      : '',
    task.batchDirectSowDate
      ? `Sow ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${task.batchDirectSowDate}T00:00:00`))}`
      : '',
  ].filter(Boolean).join(' · '),
})))

const completedTaskCount = computed(() => plannerTasks.value.filter((task) => task.done).length)
const trayDemands = computed(() => propagationStore.indoorStartDemands)
const traySummaries = computed(() => propagationStore.traySummaries)
const plantingOverview = computed(() => gardenStore.beds.map((area) => {
  const cropPlans = planningStore.getCropPlansByAreaId(area.id)
  const areaPlantings = planningStore.getPlantingsByAreaId(area.id)

  return {
    id: area.id,
    name: area.name,
    typeLabel: area.type === 'raised'
      ? 'Raised Bed'
      : area.type === 'pot'
        ? 'Pot'
        : 'Regular Bed',
    widthFeet: area.widthFeet,
    heightFeet: area.heightFeet,
    bedHeightInches: area.bedHeightInches,
    plannedCount: cropPlans.reduce((sum, cropPlan) => sum + cropPlan.targetQuantity, 0),
    placedCount: cropPlans.reduce((sum, cropPlan) => {
      const actualPlacedCount = areaPlantings.filter((planting) => planting.plantId === cropPlan.plantId).length
      return sum + Math.max(actualPlacedCount, planningStore.getInGardenCountByCropPlanId(cropPlan.id))
    }, 0),
    remainingCount: cropPlans.reduce((sum, cropPlan) => {
      const actualPlacedCount = areaPlantings.filter((planting) => planting.plantId === cropPlan.plantId).length
      const inGardenCount = Math.max(actualPlacedCount, planningStore.getInGardenCountByCropPlanId(cropPlan.id))
      return sum + Math.max(cropPlan.targetQuantity - inGardenCount, 0)
    }, 0),
    cropPlans: cropPlans.map((cropPlan) => {
      const plant = plantStore.getPlantById(cropPlan.plantId)
      const actualPlacedCount = areaPlantings.filter((planting) => planting.plantId === cropPlan.plantId).length
      const placedCount = Math.max(actualPlacedCount, planningStore.getInGardenCountByCropPlanId(cropPlan.id))

      return {
        id: cropPlan.id,
        plantId: cropPlan.plantId,
        plantName: plant?.name ?? cropPlan.plantId,
        color: plant?.color ?? '#4b5f49',
        targetQuantity: cropPlan.targetQuantity,
        placedCount,
        remainingCount: Math.max(cropPlan.targetQuantity - placedCount, 0),
        methodLabel: cropPlan.method === 'indoor_start'
          ? 'Indoor Start'
          : cropPlan.method === 'transplant'
            ? 'Transplant'
            : 'Direct Sow',
      }
    }),
  }
}))
const plantingOverviewCropPlanCount = computed(() => (
  plantingOverview.value.reduce((sum, area) => sum + area.cropPlans.length, 0)
))
const growingZoneMeta = computed(() => {
  if (scheduleStore.growingZoneSuggestion?.zone) {
    return `Zone source: ${scheduleStore.growingZoneSuggestion.source} · Confidence: ${scheduleStore.growingZoneSuggestion.confidence}`
  }

  if (scheduleStore.growingZoneSuggestion?.notes) {
    return scheduleStore.growingZoneSuggestion.notes
  }

  return ''
})
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

.workspace-tabs-card {
  border-radius: 18px;
  background: rgba(255, 252, 244, 0.84);
  backdrop-filter: blur(10px);
}

.workspace-tabs {
  padding: 4px 8px;
}

.workspace-panels {
  border-radius: 0;
}

.workspace-panel {
  padding: 0;
}

</style>
