<template>
  <q-page class="planner-page">
    <div class="planner-shell q-pa-md q-pa-lg-xl">
      <section v-if="!gardenStore.isInitialized" class="hero-copy q-mb-lg">
        <div class="text-overline text-positive">Garden Command Center</div>
        <h1 class="hero-title q-my-sm">Start your garden world and shape the season from the ground up.</h1>
        <p class="hero-body q-mb-none">
          Map the footprint, place beds and pots, sketch planting plans, and build a rhythm for trays,
          weather windows, and daily garden work.
        </p>
      </section>

      <GardenSetupForm v-if="!gardenStore.isInitialized" @submit="initializeGarden" />

      <div v-else class="column q-gutter-md">
        <section class="planner-header row items-end justify-between q-col-gutter-md">
          <div class="col">
            <div class="text-overline text-positive">Garden Command Center</div>
            <div class="planner-header__title">Shape the space, then grow the season from the canvas.</div>
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
            <q-tab name="plan" icon="edit_note" label="Layout Mode" />
            <q-tab name="current" icon="yard" label="Garden Now" />
          </q-tabs>
        </q-card>

        <GardenOnboardingCard
          :steps="seasonStartSteps"
          :completed-step-count="completedSeasonStartStepCount"
          :collapsed="isSeasonGuideCollapsed"
          :collapsed-summary="seasonGuideCollapsedSummary"
          :can-collapse="isSeasonUnderway"
          :active-step-key="activeSeasonStartStepKey"
          :metrics="seasonStartMetrics"
          @run-action="runSeasonStartAction"
          @collapse="isSeasonGuideCollapsed = true; persistSeasonGuideState()"
          @expand="isSeasonGuideCollapsed = false; persistSeasonGuideState()"
        />

        <q-tab-panels v-model="activeWorkspaceTab" animated class="workspace-panels bg-transparent">
          <q-tab-panel name="plan" class="workspace-panel">
            <div class="column q-gutter-md">
              <div
                ref="planCanvasWrapRef"
                class="workspace-canvas-wrap"
                :class="getGuideSectionClass('layout')"
              >
                <GardenCanvas
                  :planting-request="activeWorkspaceTab === 'plan' ? plantingDialogRequest : null"
                  workspace-mode="plan"
                />
              </div>

              <div ref="growingMapRef" :class="getGuideSectionClass('crops')">
              <GardenPlanOverviewCard
                :areas="plantingOverview"
                :area-count="gardenStore.beds.length"
                :crop-plan-count="plantingOverviewCropPlanCount"
                @focus-area="focusArea"
                @plant-area="openPlantingForArea"
                @plant-crop="openPlantingForCrop"
              />
              </div>

              <div ref="seasonTimingRef" :class="getGuideSectionClass('timing')">
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
              </div>

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
              <div ref="currentCanvasWrapRef" class="workspace-canvas-wrap">
                <GardenCanvas
                  :planting-request="activeWorkspaceTab === 'current' ? plantingDialogRequest : null"
                  :guided-transplant-request="activeWorkspaceTab === 'current' ? guidedTransplantRequest : null"
                  workspace-mode="current"
                  @finish-guided-transplant="finishGuidedTransplant"
                  @cancel-guided-transplant="cancelGuidedTransplant"
                />
              </div>

              <div ref="gardenRhythmRef" :class="getGuideSectionClass('today')">
              <PlannerTaskList
                :tasks="plannerTasks"
                :completed-count="completedTaskCount"
                @toggle-task="scheduleStore.setTaskDone($event.taskId, $event.done)"
                @focus-task="focusTaskArea"
                @mark-transplanted="markTaskTransplanted"
              />
              </div>

              <PlantingCalendarCard
                :tasks="plannerTasks"
                @focus-task="focusTaskArea"
              />

              <div ref="seedTraysRef" :class="getGuideSectionClass('trays')">
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
            </div>
          </q-tab-panel>
        </q-tab-panels>

        <teleport to="body">
          <div
            v-if="isTodayDashboardVisible"
            ref="todayDashboardFloatingRef"
            class="today-dashboard-float"
            :style="todayDashboardFloatingStyle"
            @click.capture="queueTodayDashboardFloatingUpdate"
            @keydown.capture="queueTodayDashboardFloatingUpdate"
          >
            <TodayDashboardCard
              :today-label="todayDashboard.todayLabel"
              :today-day-label="todayDashboard.todayDayLabel"
              :today-month-label="todayDashboard.todayMonthLabel"
              :due-today="todayDashboard.dueToday"
              :due-today-meta="todayDashboard.dueTodayMeta"
              :upcoming-this-week="todayDashboard.upcomingThisWeek"
              :upcoming-meta="todayDashboard.upcomingMeta"
              :weather-risks="todayDashboard.weatherRisks"
              :weather-meta="todayDashboard.weatherMeta"
              :propagation-status="todayDashboard.propagationStatus"
              :propagation-meta="todayDashboard.propagationMeta"
            />
          </div>
        </teleport>

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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import GardenCanvas from 'src/components/garden/GardenCanvas.vue'
import GardenDimensionsDialog from 'src/components/garden/GardenDimensionsDialog.vue'
import GardenOnboardingCard from 'src/components/garden/GardenOnboardingCard.vue'
import GardenPlanOverviewCard from 'src/components/garden/GardenPlanOverviewCard.vue'
import PropagationTrayBoard from 'src/components/garden/PropagationTrayBoard.vue'
import PlannerTaskList from 'src/components/garden/PlannerTaskList.vue'
import PlantingCalendarCard from 'src/components/garden/PlantingCalendarCard.vue'
import ScheduleSettingsCard from 'src/components/garden/ScheduleSettingsCard.vue'
import TodayDashboardCard from 'src/components/garden/TodayDashboardCard.vue'
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
import { getAreaPlantingPoints, spacingInchesToFeet } from 'src/utils/garden'

const gardenStore = useGardenStore()
const plantStore = usePlantStore()
const planningStore = usePlanningStore()
const propagationStore = usePropagationStore()
const scheduleStore = useScheduleStore()
const SEASON_GUIDE_STORAGE_KEY = 'gardening-app:season-guide'
const isGardenDimensionsOpen = ref(false)
const plantingDialogRequest = ref(null)
const guidedTransplantRequest = ref(null)
const activeWorkspaceTab = ref('plan')
const planCanvasWrapRef = ref(null)
const currentCanvasWrapRef = ref(null)
const growingMapRef = ref(null)
const seasonTimingRef = ref(null)
const gardenRhythmRef = ref(null)
const seedTraysRef = ref(null)
const todayDashboardFloatingRef = ref(null)
const highlightedGuideSectionKey = ref('')
const isSeasonGuideCollapsed = ref(false)
const isTodayDashboardVisible = ref(false)
const todayDashboardFloatingStyle = ref({
  top: '10px',
  left: '10px',
})
let guideHighlightTimeoutId = null

const dimensions = reactive({
  widthFeet: gardenStore.widthFeet,
  lengthFeet: gardenStore.lengthFeet,
})

function getTodayDateString() {
  const now = new Date()
  return [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
  ].join('-')
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function persistSeasonGuideState() {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(SEASON_GUIDE_STORAGE_KEY, JSON.stringify({
    collapsed: isSeasonGuideCollapsed.value,
  }))
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)

  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, '0'),
    `${date.getDate()}`.padStart(2, '0'),
  ].join('-')
}

function formatShortDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDayOrdinal(dayNumber) {
  const remainderTen = dayNumber % 10
  const remainderHundred = dayNumber % 100

  if (remainderTen === 1 && remainderHundred !== 11) {
    return `${dayNumber}st`
  }

  if (remainderTen === 2 && remainderHundred !== 12) {
    return `${dayNumber}nd`
  }

  if (remainderTen === 3 && remainderHundred !== 13) {
    return `${dayNumber}rd`
  }

  return `${dayNumber}th`
}

function buildChip(token) {
  if (token === 'overdue') {
    return { chipLabel: 'overdue', chipColor: 'negative' }
  }

  if (token === 'today') {
    return { chipLabel: 'today', chipColor: 'positive' }
  }

  if (token === 'warning') {
    return { chipLabel: 'warning', chipColor: 'warning' }
  }

  return { chipLabel: 'upcoming', chipColor: 'secondary' }
}

function priorityFromChip(token) {
  if (token === 'warning') {
    return 0
  }

  if (token === 'overdue') {
    return 1
  }

  if (token === 'today') {
    return 2
  }

  return 3
}

function compareDashboardItems(a, b) {
  return (a.priority ?? 99) - (b.priority ?? 99)
    || (a.dateKey ?? '').localeCompare(b.dateKey ?? '')
    || a.title.localeCompare(b.title)
}

function getActiveCanvasWrapElement() {
  return activeWorkspaceTab.value === 'current'
    ? currentCanvasWrapRef.value
    : planCanvasWrapRef.value
}

function updateTodayDashboardFloatingState() {
  const wrapper = getActiveCanvasWrapElement()
  const widget = todayDashboardFloatingRef.value

  if (!wrapper || typeof window === 'undefined') {
    isTodayDashboardVisible.value = false
    return
  }

  const wrapperRect = wrapper.getBoundingClientRect()
  const viewportInset = 10
  const stickyTopOffset = window.innerWidth <= 1023 ? 68 : 76
  const widgetWidth = widget?.offsetWidth || 260
  const maxLeft = Math.max(viewportInset, window.innerWidth - widgetWidth - viewportInset)
  const preferredLeft = wrapperRect.right - widgetWidth - 10
  const left = Math.min(Math.max(preferredLeft, viewportInset), maxLeft)
  const top = Math.max(wrapperRect.top + 10, stickyTopOffset)

  isTodayDashboardVisible.value = true
  todayDashboardFloatingStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  }
}

function queueTodayDashboardFloatingUpdate() {
  nextTick(() => {
    updateTodayDashboardFloatingState()
  })
}

watch(
  () => [gardenStore.widthFeet, gardenStore.lengthFeet],
  ([widthFeet, lengthFeet]) => {
    dimensions.widthFeet = widthFeet
    dimensions.lengthFeet = lengthFeet
  },
)

watch(activeWorkspaceTab, async () => {
  await nextTick()
  updateTodayDashboardFloatingState()
})

watch(() => gardenStore.isInitialized, async (isInitialized) => {
  if (!isInitialized) {
    isTodayDashboardVisible.value = false
    return
  }

  await nextTick()
  queueTodayDashboardFloatingUpdate()
})

onMounted(() => {
  if (canUseLocalStorage()) {
    try {
      const rawValue = window.localStorage.getItem(SEASON_GUIDE_STORAGE_KEY)
      const parsed = rawValue ? JSON.parse(rawValue) : null
      isSeasonGuideCollapsed.value = Boolean(parsed?.collapsed)
    } catch {
      window.localStorage.removeItem(SEASON_GUIDE_STORAGE_KEY)
    }
  }

  queueTodayDashboardFloatingUpdate()
  window.addEventListener('scroll', updateTodayDashboardFloatingState, { passive: true })
  window.addEventListener('resize', updateTodayDashboardFloatingState, { passive: true })
})

onBeforeUnmount(() => {
  clearGuideHighlightTimer()
  window.removeEventListener('scroll', updateTodayDashboardFloatingState)
  window.removeEventListener('resize', updateTodayDashboardFloatingState)
})

function initializeGarden({ widthFeet, lengthFeet }) {
  gardenStore.initializeGarden(widthFeet, lengthFeet)
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

function scrollToElement(target) {
  if (!target || typeof target.scrollIntoView !== 'function') {
    return
  }

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function clearGuideHighlightTimer() {
  if (guideHighlightTimeoutId !== null && typeof window !== 'undefined') {
    window.clearTimeout(guideHighlightTimeoutId)
    guideHighlightTimeoutId = null
  }
}

function highlightGuideSection(sectionKey, durationMs = 3200) {
  highlightedGuideSectionKey.value = sectionKey
  clearGuideHighlightTimer()

  if (typeof window !== 'undefined') {
    guideHighlightTimeoutId = window.setTimeout(() => {
      if (highlightedGuideSectionKey.value === sectionKey) {
        highlightedGuideSectionKey.value = ''
      }
      guideHighlightTimeoutId = null
    }, durationMs)
  }
}

function getGuideSectionClass(sectionKey) {
  return {
    'guide-section': true,
    'guide-section--active': highlightedGuideSectionKey.value === sectionKey,
  }
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
  const areaSquareFeet = area.widthFeet * area.heightFeet
  const cropPlanSummaries = cropPlans.map((cropPlan) => {
    const plant = plantStore.getPlantById(cropPlan.plantId)
    const actualPlacedCount = areaPlantings.filter((planting) => planting.plantId === cropPlan.plantId).length
    const placedCount = Math.max(actualPlacedCount, planningStore.getInGardenCountByCropPlanId(cropPlan.id))
    const spacingFeet = spacingInchesToFeet(plant?.spacingInches ?? 12)
    const estimatedFootprintSqFt = Math.max(cropPlan.targetQuantity * spacingFeet * spacingFeet, 0)
    const estimatedCapacity = getAreaPlantingPoints(area, cropPlan.plantId).length
    const utilizationPercent = areaSquareFeet > 0
      ? Math.min((estimatedFootprintSqFt / areaSquareFeet) * 100, 999)
      : 0

    return {
      id: cropPlan.id,
      plantId: cropPlan.plantId,
      plantName: plant?.name ?? cropPlan.plantId,
      color: plant?.color ?? '#4b5f49',
      shortLabel: plant?.shortLabel ?? plant?.name?.slice(0, 2)?.toUpperCase() ?? '?',
      targetQuantity: cropPlan.targetQuantity,
      placedCount,
      remainingCount: Math.max(cropPlan.targetQuantity - placedCount, 0),
      methodLabel: cropPlan.method === 'indoor_start'
        ? 'Indoor Start'
        : cropPlan.method === 'transplant'
          ? 'Transplant'
          : 'Direct Sow',
      estimatedCapacity,
      estimatedFootprintSqFt,
      utilizationPercent,
      fitStatusLabel: estimatedCapacity > 0
        ? `${cropPlan.targetQuantity} of ~${estimatedCapacity} spots`
        : `${cropPlan.targetQuantity} planned`,
    }
  })
  const totalReservedFootprint = cropPlanSummaries.reduce((sum, cropPlan) => sum + cropPlan.estimatedFootprintSqFt, 0)
  const previewSegments = cropPlanSummaries.map((cropPlan) => ({
    id: cropPlan.id,
    plantName: cropPlan.plantName,
    shortLabel: cropPlan.shortLabel,
    color: cropPlan.color,
    widthPercent: totalReservedFootprint > 0
      ? Math.max((cropPlan.estimatedFootprintSqFt / totalReservedFootprint) * 100, 12)
      : 100 / Math.max(cropPlanSummaries.length, 1),
  }))
  const reservedAreaPercent = areaSquareFeet > 0
    ? Math.round((totalReservedFootprint / areaSquareFeet) * 100)
    : 0

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
    areaSquareFeet,
    plannedCount: cropPlanSummaries.reduce((sum, cropPlan) => sum + cropPlan.targetQuantity, 0),
    placedCount: cropPlanSummaries.reduce((sum, cropPlan) => sum + cropPlan.placedCount, 0),
    remainingCount: cropPlanSummaries.reduce((sum, cropPlan) => sum + cropPlan.remainingCount, 0),
    reservedAreaPercent,
    previewSegments,
    cropPlans: cropPlanSummaries,
  }
}))
const plantingOverviewCropPlanCount = computed(() => (
  plantingOverview.value.reduce((sum, area) => sum + area.cropPlans.length, 0)
))
const indoorStartCropPlanCount = computed(() => (
  planningStore.cropPlans.filter((cropPlan) => cropPlan.method === 'indoor_start' && cropPlan.targetQuantity > 0).length
))
const totalGardenAreaSqFt = computed(() => gardenStore.widthFeet * gardenStore.lengthFeet)
const totalGrowingAreaSqFt = computed(() => (
  gardenStore.beds.reduce((sum, bed) => sum + (bed.widthFeet * bed.heightFeet), 0)
))
const estimatedSoilVolumeCubicFt = computed(() => (
  gardenStore.beds.reduce((sum, bed) => {
    if (!bed.bedHeightInches) {
      return sum
    }

    return sum + (bed.widthFeet * bed.heightFeet * (bed.bedHeightInches / 12))
  }, 0)
))
const hasSeasonTiming = computed(() => Boolean(
  scheduleStore.zipCode
  || scheduleStore.usdaZone
  || (scheduleStore.lastFrostDate && scheduleStore.firstFrostDate)
))
const hasTrayActivity = computed(() => (
  propagationStore.trays.length > 0
  || trayDemands.value.length > 0
))
const hasTodaySignals = computed(() => (
  plannerTasks.value.length > 0
  || Boolean(scheduleStore.lastUpdatedAt)
))
const isSeasonUnderway = computed(() => {
  const layoutReady = gardenStore.beds.length > 0
  const cropsReady = plantingOverviewCropPlanCount.value > 0
  const timingReady = hasSeasonTiming.value
  const trayReady = indoorStartCropPlanCount.value === 0 || hasTrayActivity.value

  return layoutReady && cropsReady && timingReady && trayReady
})
const seasonStartSteps = computed(() => {
  const layoutComplete = gardenStore.beds.length > 0
  const cropsComplete = plantingOverviewCropPlanCount.value > 0
  const timingComplete = hasSeasonTiming.value
  const traysRelevant = indoorStartCropPlanCount.value > 0
  const traysComplete = !traysRelevant || hasTrayActivity.value
  const todayComplete = hasTodaySignals.value
  const firstIncompleteKey = [
    layoutComplete ? null : 'layout',
    cropsComplete ? null : 'crops',
    timingComplete ? null : 'timing',
    traysComplete ? null : 'trays',
    todayComplete ? null : 'today',
  ].find(Boolean)

  const statusFor = (key, complete) => {
    if (complete) {
      return 'complete'
    }

    return firstIncompleteKey === key ? 'current' : 'upcoming'
  }

  return [
    {
      key: 'layout',
      title: 'Lay Out Beds and Pots',
      body: layoutComplete
        ? 'The garden has mapped growing zones and is ready for crop decisions.'
        : 'Place the first bed or pot on the canvas, then shape the footprint of the space.',
      meta: layoutComplete
        ? `${gardenStore.beds.length} zone${gardenStore.beds.length === 1 ? '' : 's'} mapped · ${Math.round(totalGrowingAreaSqFt.value)} sq ft in play`
        : `${Math.round(totalGardenAreaSqFt.value)} sq ft total footprint`,
      status: statusFor('layout', layoutComplete),
      actionKey: 'layout',
      actionLabel: layoutComplete ? 'Add Another Zone' : 'Place First Bed',
    },
    {
      key: 'crops',
      title: 'Plan What Grows Where',
      body: cropsComplete
        ? 'At least one zone already has a crop plan, so the season can start generating work.'
        : 'Open a zone and decide what should grow there, plus how many plants or sowing spots you want.',
      meta: cropsComplete
        ? `${plantingOverviewCropPlanCount.value} crop plan${plantingOverviewCropPlanCount.value === 1 ? '' : 's'} sketched`
        : 'Crop plans create tray demand, planting dates, and daily tasks.',
      status: statusFor('crops', cropsComplete),
      actionKey: 'crops',
      actionLabel: gardenStore.beds.length ? 'Plan First Zone' : 'Map a Zone First',
    },
    {
      key: 'timing',
      title: 'Set the Season Clock',
      body: timingComplete
        ? 'Climate timing is in place, so frost windows can drive better planting dates.'
        : 'Set ZIP, zone, and frost timing so the app can sketch better seasonal windows.',
      meta: timingComplete
        ? `${scheduleStore.locationDisplayName || 'Climate saved'} · ${scheduleStore.lastFrostDate || scheduleStore.averageLastFrostDate || 'frost window'}`
        : 'Start here before trusting suggested task dates.',
      status: statusFor('timing', timingComplete),
      actionKey: 'timing',
      actionLabel: 'Open Season Timing',
    },
    {
      key: 'trays',
      title: 'Wake the Seed Trays',
      body: traysRelevant
        ? (traysComplete
          ? 'Indoor starts have tray space or active tray demand, so seed-start workflow is alive.'
          : 'Indoor-start crops need tray space before they can move toward transplant season.')
        : 'If a crop needs an indoor start later, tray demand will appear here automatically.',
      meta: traysRelevant
        ? `${indoorStartCropPlanCount.value} indoor-start crop plan${indoorStartCropPlanCount.value === 1 ? '' : 's'}`
        : 'No indoor starts planned yet.',
      status: statusFor('trays', traysComplete),
      actionKey: 'trays',
      actionLabel: traysRelevant ? 'Open Seed Trays' : 'View Tray Board',
    },
    {
      key: 'today',
      title: 'Open the Daily Rhythm',
      body: todayComplete
        ? 'Tasks, alerts, and weather are ready to guide the day.'
        : 'Once crops and timing are in place, the app will start surfacing what matters today and this week.',
      meta: todayComplete
        ? `${plannerTasks.value.length} task${plannerTasks.value.length === 1 ? '' : 's'} · ${scheduleStore.activeAlerts.length} alert${scheduleStore.activeAlerts.length === 1 ? '' : 's'}`
        : 'This becomes the daily control layer for the garden.',
      status: statusFor('today', todayComplete),
      actionKey: 'today',
      actionLabel: 'Open Garden Now',
    },
  ]
})
const activeSeasonStartStepKey = computed(() => (
  seasonStartSteps.value.find((step) => step.status === 'current')?.key ?? ''
))
const completedSeasonStartStepCount = computed(() => (
  seasonStartSteps.value.filter((step) => step.status === 'complete').length
))
const seasonGuideCollapsedSummary = computed(() => {
  const parts = [
    `${gardenStore.beds.length} zone${gardenStore.beds.length === 1 ? '' : 's'} mapped`,
    `${plantingOverviewCropPlanCount.value} crop plan${plantingOverviewCropPlanCount.value === 1 ? '' : 's'}`,
    scheduleStore.locationDisplayName || 'season timing saved',
  ]

  if (indoorStartCropPlanCount.value > 0) {
    parts.push(`${propagationStore.trays.length} tray${propagationStore.trays.length === 1 ? '' : 's'} active`)
  }

  return parts.join(' · ')
})
const seasonStartMetrics = computed(() => ({
  footprintLabel: `${Math.round(totalGardenAreaSqFt.value)} sq ft footprint`,
  growingAreaLabel: `${Math.round(totalGrowingAreaSqFt.value)} sq ft growing area`,
  soilVolumeLabel: `${estimatedSoilVolumeCubicFt.value.toFixed(1)} cu ft soil volume`,
}))
const growingZoneMeta = computed(() => {
  if (scheduleStore.growingZoneSuggestion?.zone) {
    return `Zone source: ${scheduleStore.growingZoneSuggestion.source} · Confidence: ${scheduleStore.growingZoneSuggestion.confidence}`
  }

  if (scheduleStore.growingZoneSuggestion?.notes) {
    return scheduleStore.growingZoneSuggestion.notes
  }

  return ''
})

async function runSeasonStartAction(actionKey) {
  if (actionKey === 'layout') {
    activeWorkspaceTab.value = 'plan'
    await nextTick()
    addArea('raised')
    scrollToElement(planCanvasWrapRef.value)
    highlightGuideSection('layout')
    return
  }

  if (actionKey === 'crops') {
    activeWorkspaceTab.value = 'plan'
    await nextTick()

    if (gardenStore.beds.length) {
      openPlantingForArea(gardenStore.beds[0].id)
      scrollToElement(growingMapRef.value)
      highlightGuideSection('crops')
    } else {
      addArea('raised')
      scrollToElement(planCanvasWrapRef.value)
      highlightGuideSection('layout')
    }
    return
  }

  if (actionKey === 'timing') {
    activeWorkspaceTab.value = 'plan'
    await nextTick()
    scrollToElement(seasonTimingRef.value)
    highlightGuideSection('timing')
    return
  }

  if (actionKey === 'trays') {
    activeWorkspaceTab.value = 'current'
    await nextTick()
    scrollToElement(seedTraysRef.value)
    highlightGuideSection('trays')
    return
  }

  if (actionKey === 'today') {
    activeWorkspaceTab.value = 'current'
    await nextTick()
    scrollToElement(gardenRhythmRef.value)
    highlightGuideSection('today')
  }
}

watch(activeSeasonStartStepKey, (nextKey, previousKey) => {
  if (!nextKey || nextKey === previousKey) {
    return
  }

  if (!previousKey) {
    return
  }

  highlightGuideSection(nextKey, 2600)
})

watch(isSeasonUnderway, (isUnderway, wasUnderway) => {
  if (!isUnderway || wasUnderway) {
    return
  }

  isSeasonGuideCollapsed.value = true
  persistSeasonGuideState()
})

const todayDashboard = computed(() => {
  const today = getTodayDateString()
  const endOfWeek = addDays(today, 7)
  const todayDate = new Date(`${today}T00:00:00`)
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(todayDate)
  const todayDayLabel = formatDayOrdinal(todayDate.getDate())
  const todayMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(todayDate)
  const openTasks = plannerTasks.value.filter((task) => !task.done)

  const dueToday = openTasks
    .filter((task) => task.dueDate && task.dueDate <= today)
    .map((task) => {
      const chipToken = task.dueDate < today ? 'overdue' : 'today'

      return {
        id: `task-${task.id}`,
        title: task.title,
        meta: [
          task.taskTypeLabel,
          task.areaName,
          task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : '',
        ].filter(Boolean).join(' · '),
        note: task.progressText || task.batchTimingLabel || '',
        dateKey: task.dueDate || '',
        priority: priorityFromChip(chipToken),
        ...buildChip(chipToken),
      }
    })
    .sort(compareDashboardItems)

  const batchIdsWithUpcomingTasks = new Set()
  const upcomingTaskItems = openTasks
    .filter((task) => task.dueDate && task.dueDate > today && task.dueDate <= endOfWeek)
    .map((task) => {
      batchIdsWithUpcomingTasks.add(task.batchId)

      return {
        id: `task-${task.id}`,
        title: task.title,
        meta: `${task.taskTypeLabel} · ${task.areaName} · Due ${formatShortDate(task.dueDate)}`,
        note: task.batchTimingLabel || task.progressText || '',
        dateKey: task.dueDate,
        priority: priorityFromChip('upcoming'),
        ...buildChip('upcoming'),
      }
    })

  const weeklyBatchCount = scheduleStore.plantingBatches.filter((batch) => (
    [batch.startIndoorDate, batch.transplantDate, batch.directSowDate]
      .filter(Boolean)
      .some((dateValue) => dateValue > today && dateValue <= endOfWeek)
  )).length

  const upcomingBatchItems = scheduleStore.plantingBatches
    .filter((batch) => batch.remainingCount > 0 && !batchIdsWithUpcomingTasks.has(batch.id))
    .flatMap((batch) => {
      const windows = [
        batch.startIndoorDate
          ? {
              id: `batch-${batch.id}-start`,
              title: `Indoor start window for ${batch.plantName}`,
              meta: `Batch planning · ${batch.areaName} · ${formatShortDate(batch.startIndoorDate)}`,
              note: `${batch.remainingCount} still planned in this batch.`,
              dateKey: batch.startIndoorDate,
            }
          : null,
        batch.transplantDate
          ? {
              id: `batch-${batch.id}-transplant`,
              title: `Transplant window for ${batch.plantName}`,
              meta: `Batch planning · ${batch.areaName} · ${formatShortDate(batch.transplantDate)}`,
              note: `${batch.remainingCount} still planned in this batch.`,
              dateKey: batch.transplantDate,
            }
          : null,
        batch.directSowDate
          ? {
              id: `batch-${batch.id}-sow`,
              title: `Direct sow window for ${batch.plantName}`,
              meta: `Batch planning · ${batch.areaName} · ${formatShortDate(batch.directSowDate)}`,
              note: `${batch.remainingCount} still planned in this batch.`,
              dateKey: batch.directSowDate,
            }
          : null,
      ].filter(Boolean)

      return windows.filter((entry) => entry.dateKey > today && entry.dateKey <= endOfWeek)
    })
    .map((item) => ({
      ...item,
      priority: priorityFromChip('upcoming'),
      ...buildChip('upcoming'),
    }))

  const activeWeatherAlertItems = scheduleStore.activeAlerts.map((alert) => ({
    id: `alert-${alert.id}`,
    title: alert.event || 'Active weather alert',
    meta: [
      alert.severity || 'Weather alert',
      alert.startsAt ? `Starts ${formatDateTime(alert.startsAt)}` : '',
      alert.endsAt ? `Ends ${formatDateTime(alert.endsAt)}` : '',
    ].filter(Boolean).join(' · '),
    note: alert.headline || alert.description || 'Review timing before outdoor work.',
    dateKey: alert.startsAt || '',
    priority: priorityFromChip('warning'),
    ...buildChip('warning'),
  }))

  const weatherFlagItems = [
    scheduleStore.hasFreezeRisk
      ? {
          id: 'risk-freeze',
          title: 'Freeze risk in the 7-day outlook',
          meta: 'Weather flag · Watch low overnight temperatures.',
          note: 'Check coverings and timing before outdoor planting work.',
          dateKey: '',
          priority: priorityFromChip('warning'),
          ...buildChip('warning'),
        }
      : null,
    scheduleStore.hasHeatRisk
      ? {
          id: 'risk-heat',
          title: 'Heat stress possible this week',
          meta: 'Weather flag · High daytime temperatures ahead.',
          note: 'Plan heavier work earlier in the day and watch water demand.',
          dateKey: '',
          priority: priorityFromChip('warning'),
          ...buildChip('warning'),
        }
      : null,
    scheduleStore.hasWindRisk
      ? {
          id: 'risk-wind',
          title: 'High wind may affect outdoor work',
          meta: 'Weather flag · Wind or gusts cross the current threshold.',
          note: 'Avoid delicate transplant or hardening-off work during peak wind.',
          dateKey: '',
          priority: priorityFromChip('warning'),
          ...buildChip('warning'),
        }
      : null,
  ].filter(Boolean)

  const transplantReadyItems = traySummaries.value
    .flatMap((tray) => tray.assignments
      .filter((assignment) => assignment.status === 'ready_to_transplant')
      .map((assignment) => ({
        id: `assignment-${assignment.id}`,
        title: `${assignment.plantName} is ready to transplant`,
        meta: `${tray.name} · ${assignment.areaName} · ${assignment.cellCount} cells`,
        note: assignment.transplantDate
          ? `Target transplant window ${formatShortDate(assignment.transplantDate)}.`
          : 'Tray cells are marked ready to transplant.',
        dateKey: assignment.transplantDate || '',
        priority: priorityFromChip('warning'),
        ...buildChip('warning'),
      })))

  const trayLoadItems = traySummaries.value
    .filter((tray) => tray.assignments.length > 0 && tray.status !== 'complete')
    .map((tray) => ({
      id: `tray-${tray.id}`,
      title: `${tray.name} is in active rotation`,
      meta: `${tray.statusLabel} · ${tray.usedCells}/${tray.cellCount} cells used`,
      note: tray.transplantStartDate
        ? `Current transplant window starts ${formatShortDate(tray.transplantStartDate)}.`
        : `${tray.openCells} open cells remain in this tray.`,
      dateKey: tray.transplantStartDate || '',
      priority: priorityFromChip('upcoming'),
      ...buildChip('upcoming'),
    }))

  const trayDemandItems = trayDemands.value.slice(0, 3).map((demand) => ({
    id: `demand-${demand.batchId}`,
    title: `${demand.plantName} still needs tray space`,
    meta: `${demand.areaName} · ${demand.remainingCells} cells unassigned`,
    note: demand.recommendedTrayName
      ? `Best fit right now: ${demand.recommendedTrayName}.`
      : 'Create or repurpose tray space for this batch.',
    dateKey: demand.startIndoorDate || demand.transplantDate || '',
    priority: priorityFromChip('upcoming'),
    ...buildChip('upcoming'),
  }))

  return {
    todayLabel,
    todayDayLabel,
    todayMonthLabel,
    dueToday,
    dueTodayMeta: dueToday.length
      ? `${dueToday.filter((item) => item.chipLabel === 'overdue').length} overdue first`
      : `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} in the planner`,
    upcomingThisWeek: [...upcomingTaskItems, ...upcomingBatchItems]
      .sort(compareDashboardItems)
      .slice(0, 6),
    upcomingMeta: `${weeklyBatchCount} planting window${weeklyBatchCount === 1 ? '' : 's'} this week`,
    weatherRisks: [...activeWeatherAlertItems, ...weatherFlagItems].sort(compareDashboardItems),
    weatherMeta: scheduleStore.hasActiveWeatherAlerts
      ? `${scheduleStore.activeAlerts.length} active alert${scheduleStore.activeAlerts.length === 1 ? '' : 's'}`
      : scheduleStore.lastUpdatedAt
        ? `Updated ${formatDateTime(scheduleStore.lastUpdatedAt)}`
        : 'Refresh the sky view to update risk flags',
    propagationStatus: [...transplantReadyItems, ...trayLoadItems, ...trayDemandItems]
      .sort(compareDashboardItems)
      .slice(0, 6),
    propagationMeta: `${traySummaries.value.length} tray${traySummaries.value.length === 1 ? '' : 's'} · ${trayDemands.value.length} active demand${trayDemands.value.length === 1 ? '' : 's'}`,
  }
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

.workspace-canvas-wrap {
  position: relative;
}

.guide-section {
  border-radius: 22px;
  transition: box-shadow 180ms ease, transform 180ms ease, background-color 180ms ease;
}

.guide-section--active {
  background: rgba(249, 221, 136, 0.12);
  box-shadow: 0 0 0 2px rgba(223, 168, 53, 0.38), 0 12px 28px rgba(76, 93, 46, 0.12);
  transform: translateY(-1px);
}

.today-dashboard-float {
  position: fixed;
  z-index: 80;
  width: min(320px, calc(100vw - 16px));
  pointer-events: auto;
  transition: top 0.16s ease, left 0.16s ease;
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

@media (max-width: 1023px) {
  .today-dashboard-float {
    width: min(280px, calc(100vw - 16px));
  }
}

</style>
