<template>
  <q-page class="planner-page" :class="`planner-page--${activeWorkspaceTab}`">
    <div
      class="planner-shell"
      :class="[
        { 'q-pa-md q-pa-lg-xl': !gardenStore.isInitialized, 'planner-shell--canvas': gardenStore.isInitialized },
        `planner-shell--${activeWorkspaceTab}`,
      ]"
    >
      <section v-if="!gardenStore.isInitialized" class="hero-copy q-mb-lg">
        <div class="text-overline text-positive">Garden Command Center</div>
        <h1 class="hero-title q-my-sm">Start your garden world and shape the season from the ground up.</h1>
        <p class="hero-body q-mb-none">
          Map the footprint, place beds and pots, sketch planting plans, and build a rhythm for trays,
          weather windows, and daily garden work.
        </p>
      </section>

      <GardenSetupForm v-if="!gardenStore.isInitialized" @submit="initializeGarden" />

      <div v-else class="column q-gutter-sm planner-shell--immersive">
        <q-tab-panels v-model="activeWorkspaceTab" animated class="workspace-panels bg-transparent">
          <q-tab-panel name="layout" class="workspace-panel">
            <div class="simulation-screen">
              <div class="simulation-stage">
                <div class="workspace-canvas-wrap simulation-stage__canvas-wrap">
                  <GardenCanvas
                    :mobile-capture-mode="isMobileCaptureMode"
                    :active-tool="activeCanvasTool"
                    :grid-scale="selectedGridScale"
                    :placement-preview="activeWorkspaceTab === 'layout' ? pendingPlacement : null"
                    :placement-preview-locked="activeWorkspaceTab === 'layout' ? isPendingPlacementPinned : false"
                    workspace-mode="layout"
                    @change-tool="activeCanvasTool = $event"
                    @request-measurement="handleMeasurementRequest"
                    @update-placement-preview="updatePendingPlacementPosition"
                    @toggle-placement-preview-lock="togglePendingPlacementPin"
                  />
                </div>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="plan" class="workspace-panel">
            <div class="simulation-screen">
              <div class="simulation-stage">
                <div class="workspace-canvas-wrap simulation-stage__canvas-wrap">
                  <GardenCanvas
                    :planting-request="activeWorkspaceTab === 'plan' ? plantingDialogRequest : null"
                    :mobile-capture-mode="isMobileCaptureMode"
                    :active-tool="activeCanvasTool"
                    :grid-scale="selectedGridScale"
                    :placement-preview="null"
                    workspace-mode="plan"
                    @change-tool="activeCanvasTool = $event"
                    @request-measurement="handleMeasurementRequest"
                  />
                </div>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="current" class="workspace-panel">
            <div class="simulation-screen">
              <div class="simulation-stage">
                <div class="workspace-canvas-wrap simulation-stage__canvas-wrap">
                  <GardenCanvas
                    :planting-request="activeWorkspaceTab === 'current' ? plantingDialogRequest : null"
                    :guided-transplant-request="activeWorkspaceTab === 'current' ? guidedTransplantRequest : null"
                    :mobile-capture-mode="isMobileCaptureMode"
                    :active-tool="activeCanvasTool"
                    :grid-scale="selectedGridScale"
                    :placement-preview="null"
                    workspace-mode="current"
                    @change-tool="activeCanvasTool = $event"
                    @request-measurement="handleMeasurementRequest"
                    @finish-guided-transplant="finishGuidedTransplant"
                    @cancel-guided-transplant="cancelGuidedTransplant"
                  />
                </div>
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>

        <div class="simulation-shell-overlay">
          <div class="simulation-stage__topbar" :class="`simulation-stage__topbar--${activeWorkspaceTab}`">
            <div class="simulation-stage__topbar-panel">
              <TodayDashboardCard
                v-if="!isMobileCaptureMode || isTodayDashboardOpen"
                class="simulation-stage__today-card"
                :today-label="todayDashboard.todayLabel"
                :today-day-label="todayDashboard.todayDayLabel"
                :today-month-label="todayDashboard.todayMonthLabel"
                :due-today="todayDashboard.dueToday"
                :due-today-meta="todayDashboard.dueTodayMeta"
                :upcoming-this-week="todayDashboard.upcomingThisWeek"
                :upcoming-meta="todayDashboard.upcomingMeta"
                :weather-risks="todayDashboard.weatherRisks"
                :weather-meta="todayDashboard.weatherMeta"
                :today-weather-high="todayDashboard.todayWeatherHigh"
                :today-weather-low="todayDashboard.todayWeatherLow"
                :propagation-status="todayDashboard.propagationStatus"
                :propagation-meta="todayDashboard.propagationMeta"
                :tone="activeWorkspaceTab"
                map-mode
                compact
                @collapse="isTodayDashboardOpen = false"
              />

              <q-btn-toggle
                v-model="activeWorkspaceTab"
                unelevated
                rounded
                :toggle-color="workspaceTheme.accentColor"
                color="white"
                text-color="grey-8"
                class="simulation-stage__nav-toggle"
                :options="[
                  { label: 'Map', value: 'layout' },
                  { label: 'Plan', value: 'plan' },
                  { label: 'In Garden', value: 'current' },
                ]"
              />

              <div class="simulation-stage__topbar-actions">
                <q-chip dense :color="workspaceTheme.chipColor" text-color="white">
                  <GardenUiIcon
                    :paths="workspaceBadgeIconPaths"
                    size="18px"
                    color="#ffffff"
                    class="simulation-stage__chip-icon"
                  />
                  {{ activeToolLabel }}
                </q-chip>
                <q-btn
                  ref="gridMenuTrigger"
                  unelevated
                  rounded
                  color="white"
                  text-color="grey-8"
                  class="simulation-stage__grid-trigger"
                  @click="isGridMenuOpen = !isGridMenuOpen"
                >
                  <div class="simulation-stage__grid-trigger-content">
                    <GardenUiIcon
                      :paths="gridIconPaths"
                      size="18px"
                      color="#4a5a45"
                    />
                    <span>{{ selectedGridScaleLabel }}</span>
                  </div>
                </q-btn>
                <q-menu
                  v-model="isGridMenuOpen"
                  anchor="bottom right"
                  self="top right"
                  :offset="[0, 10]"
                >
                  <q-list dense class="simulation-stage__grid-menu">
                    <q-item clickable v-close-popup @click="selectedGridScale = 'one_foot'">
                      <q-item-section>1 ft grid</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="selectedGridScale = 'six_in'">
                      <q-item-section>6 in grid</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="selectedGridScale = 'three_in'">
                      <q-item-section>3 in grid</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </div>
            </div>
          </div>

          <GardenBuildOverlay
            :show-launcher="activeWorkspaceTab === 'layout' && !pendingPlacement"
            :is-capture-panel-open="isCapturePanelOpen"
            :show-capture-sheet="activeWorkspaceTab === 'layout' && isCapturePanelOpen && !pendingPlacement"
            :show-placement-toolbar="activeWorkspaceTab === 'layout' && isPendingPlacementToolbarVisible"
            :accent-color="workspaceTheme.accentColor"
            :is-mobile-capture-mode="isMobileCaptureMode"
            :capture-groups="captureGroups"
            :capture-items="captureItems"
            :selected-capture-group="selectedCaptureGroup"
            :pending-placement="pendingPlacement"
            :pending-placement-toolbar-style="pendingPlacementToolbarStyle"
            :pending-placement-size-label="pendingPlacementSizeLabel"
            :placement-feedback="placementFeedback"
            @toggle-capture-panel="toggleCapturePanel"
            @close-capture-panel="closeCapturePanel"
            @toggle-capture-group="toggleCaptureGroup"
            @start-placement="startPlacementFromPalette"
            @set-toolbar-hovered="isPlacementToolbarHovered = $event"
            @rotate-pending-placement="rotatePendingPlacement"
            @cycle-pending-placement-size="cyclePendingPlacementSize"
            @place-pending-placement="placePendingPlacement"
            @cancel-pending-placement="cancelPendingPlacement"
          />

          <GardenCapturePalette
            :active-tool="activeCanvasTool"
            :zoom="gardenStore.viewport.zoom"
            :primary-tools="palettePrimaryTools"
            :accent-color="workspaceTheme.accentColor"
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @change-tool="handleCanvasToolChange"
          />

          <div class="simulation-stage__assistant-rail">
            <q-btn
              v-if="isMobileCaptureMode && !isTodayDashboardOpen"
              round
              unelevated
              color="white"
              text-color="grey-8"
              class="simulation-stage__today-toggle"
              @click="isTodayDashboardOpen = true"
            >
              <GardenUiIcon
                :paths="todayRailIconPaths"
                size="30px"
                color="#4a5a45"
              />
              <q-tooltip>Open today panel</q-tooltip>
            </q-btn>
            <q-btn round unelevated color="dark" text-color="white" @click="openAssistant(assistantDefaultSection)">
              <GardenUiIcon
                :paths="assistantHomeIconPaths"
                size="32px"
                color="#ffffff"
              />
              <q-tooltip>Open Garden Assistant</q-tooltip>
              <q-badge
                v-if="assistantAlertCount"
                color="negative"
                rounded
                floating
                :label="assistantAlertCount"
              />
            </q-btn>
            <q-btn
              v-for="button in assistantRailButtons"
              :key="button.section"
              round
              unelevated
              color="white"
              text-color="grey-8"
              @click="openAssistant(button.section)"
            >
              <GardenUiIcon
                :paths="button.iconPaths"
                size="30px"
                color="#4a5a45"
              />
              <q-tooltip>{{ button.tooltip }}</q-tooltip>
            </q-btn>
          </div>
        </div>

        <GardenAssistantPanel
          :open="isAssistantOpen"
          :position="assistantPosition"
          :is-mobile-capture-mode="isMobileCaptureMode"
          :assistant-section="assistantSection"
          :assistant-tabs="assistantTabs"
          :schedule-store="scheduleStore"
          :today-dashboard="todayDashboard"
          :planner-tasks="plannerTasks"
          :completed-task-count="completedTaskCount"
          :tray-demands="trayDemands"
          :tray-summaries="traySummaries"
          :tray-options="propagationStore.trayOptions"
          :tray-status-options="TRAY_STATUS_OPTIONS"
          :assignment-status-options="ASSIGNMENT_STATUS_OPTIONS"
          @update:open="isAssistantOpen = $event"
          @update:section="assistantSection = $event"
          @refresh-weather="scheduleStore.refreshWeather()"
          @toggle-task="scheduleStore.setTaskDone($event.taskId, $event.done)"
          @focus-task="focusTaskArea"
          @mark-transplanted="markTaskTransplanted"
          @create-tray="propagationStore.createTray($event)"
          @assign-demand="propagationStore.assignBatchToTray($event.batchId, $event.trayId, $event.cellCount)"
          @quick-assign-new-tray="quickAssignDemandToNewTray"
          @guided-transplant="startGuidedTransplant"
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
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import GardenAssistantPanel from 'src/components/garden/GardenAssistantPanel.vue'
import GardenBuildOverlay from 'src/components/garden/GardenBuildOverlay.vue'
import GardenCanvas from 'src/components/garden/GardenCanvas.vue'
import GardenCapturePalette from 'src/components/garden/GardenCapturePalette.vue'
import GardenDimensionsDialog from 'src/components/garden/GardenDimensionsDialog.vue'
import GardenUiIcon from 'src/components/garden/GardenUiIcon.vue'
import TodayDashboardCard from 'src/components/garden/TodayDashboardCard.vue'
import GardenSetupForm from 'src/components/garden/GardenSetupForm.vue'
import { useAssistantUiModel } from 'src/composables/useAssistantUiModel'
import { useGuidedTransplant } from 'src/composables/useGuidedTransplant'
import { usePendingPlacement } from 'src/composables/usePendingPlacement'
import { usePlannerTasks } from 'src/composables/usePlannerTasks'
import { useTodayDashboard } from 'src/composables/useTodayDashboard'
import { captureGroups, captureItems } from 'src/config/garden-build'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlanningStore } from 'src/stores/planning-store'
import {
  ASSIGNMENT_STATUS_OPTIONS,
  TRAY_STATUS_OPTIONS,
  usePropagationStore,
} from 'src/stores/propagation-store'
import { useScheduleStore } from 'src/stores/schedule-store'

const $q = useQuasar()
const gardenStore = useGardenStore()
const planningStore = usePlanningStore()
const propagationStore = usePropagationStore()
const scheduleStore = useScheduleStore()
const isGardenDimensionsOpen = ref(false)
const plantingDialogRequest = ref(null)
const activeWorkspaceTab = ref('layout')
const isMobileCaptureMode = computed(() => $q.screen.lt.md)
const activeCanvasTool = ref('move')
const selectedGridScale = ref('six_in')
const isCapturePanelOpen = ref(false)
const selectedCaptureGroup = ref(null)
const placementFeedback = ref('')
const isTodayDashboardOpen = ref(false)
const isAssistantOpen = ref(false)
const assistantSection = ref('rhythm')
const workspaceTheme = computed(() => (
  activeWorkspaceTab.value === 'layout'
    ? {
        accentColor: 'positive',
        chipColor: 'dark',
        icon: 'home_repair_service',
      }
    : activeWorkspaceTab.value === 'plan'
      ? {
          accentColor: 'warning',
          chipColor: 'warning',
          icon: 'eco',
        }
      : {
        accentColor: 'primary',
        chipColor: 'primary',
        icon: 'spa',
      }
))
const workspaceBadgeIconPaths = computed(() => (
  activeWorkspaceTab.value === 'layout'
    ? [
        { d: 'M7 7H17V17H7V7Z' },
        { d: 'M12 7V17' },
        { d: 'M7 12H17' },
      ]
    : activeWorkspaceTab.value === 'plan'
      ? [
          { d: 'M8.2 15.4C10.9 13.8 12 10.8 16 8.8C15.7 13 12.6 16 8.8 16C8.3 16 7.8 15.8 8.2 15.4Z' },
          { d: 'M10.5 15.4L13.5 12.4' },
        ]
      : [
          { d: 'M12 7V18' },
          { d: 'M8.4 11.2C8.4 8.9 10.1 7.2 12.4 7.2C14.7 7.2 16.4 8.9 16.4 11.2C16.4 13.5 14.7 15.2 12.4 15.2C10.1 15.2 8.4 13.5 8.4 11.2Z' },
          { d: 'M9.8 12.5L11.8 14.1L15 10.3' },
        ]
))
const gridIconPaths = [
  { d: 'M7 7H17V17H7V7Z' },
  { d: 'M12 7V17' },
  { d: 'M7 12H17' },
]
const palettePrimaryTools = computed(() => (
  activeWorkspaceTab.value === 'layout'
    ? [
        { value: 'measure', icon: 'straighten', label: 'Measure the garden footprint' },
      ]
    : activeWorkspaceTab.value === 'plan'
      ? [
          { value: 'plant', icon: 'eco', label: 'Plan what grows in each zone' },
          { value: 'measure', icon: 'straighten', label: 'Check spacing and size' },
        ]
      : [
          { value: 'plant', icon: 'spa', label: 'Update what is in the garden now' },
          { value: 'measure', icon: 'straighten', label: 'Check spacing and size' },
        ]
))
const activeToolLabel = computed(() => (
  pendingPlacement.value
    ? `Placing ${pendingPlacement.value.label}`
    : activeCanvasTool.value === 'resize'
      ? 'Resize'
      : activeCanvasTool.value === 'rotate'
        ? 'Rotate'
        : activeCanvasTool.value === 'measure'
          ? 'Measure'
          : activeCanvasTool.value === 'plant'
            ? (activeWorkspaceTab.value === 'current' ? 'In Garden' : 'Plant')
            : activeWorkspaceTab.value === 'layout'
              ? 'Map'
              : 'Move'
))
const selectedGridScaleLabel = computed(() => (
  selectedGridScale.value === 'three_in'
    ? '3 in'
    : selectedGridScale.value === 'six_in'
      ? '6 in'
      : '1 ft'
))
const assistantPosition = computed(() => (isMobileCaptureMode.value ? 'bottom' : 'right'))
const dimensions = reactive({
  widthFeet: gardenStore.widthFeet,
  lengthFeet: gardenStore.lengthFeet,
})
const todayRailIconPaths = [
  { d: 'M7 8.5H17V18H7V8.5Z' },
  { d: 'M7 11H17' },
  { d: 'M9 5.5V8' },
  { d: 'M15 5.5V8' },
  { d: 'M10.5 13.5L11.8 11.7L13 13.1L14.6 10.8' },
]
const assistantHomeIconPaths = [
  { d: 'M12 4.5L19 9.8V19H5V9.8L12 4.5Z' },
  { d: 'M9 19V12H15V19' },
  { d: 'M10.2 14H13.8' },
]
const isGridMenuOpen = ref(false)

watch(
  () => [gardenStore.widthFeet, gardenStore.lengthFeet],
  ([widthFeet, lengthFeet]) => {
    dimensions.widthFeet = widthFeet
    dimensions.lengthFeet = lengthFeet
  },
)

watch(activeWorkspaceTab, (nextTab) => {
  if (nextTab === 'layout' && activeCanvasTool.value === 'plant') {
    activeCanvasTool.value = 'move'
  }

  if (nextTab !== 'layout') {
    isCapturePanelOpen.value = false
    clearPlacementFeedback()
    clearPendingPlacement()
  }

  if (!assistantTabs.value.some((tab) => tab.name === assistantSection.value)) {
    assistantSection.value = assistantTabs.value[0]?.name ?? 'rhythm'
  }
})

function initializeGarden({ widthFeet, lengthFeet }) {
  gardenStore.initializeGarden(widthFeet, lengthFeet)
  activeWorkspaceTab.value = 'layout'
}

function addArea(type, overrides = {}) {
  const nextBed = gardenStore.addBed(type, overrides)
  activeCanvasTool.value = 'move'

  if (activeWorkspaceTab.value === 'layout' && nextBed?.id) {
    gardenStore.setSelectedBed(nextBed.id)
  }

  return nextBed
}

const {
  pendingPlacement,
  isPendingPlacementPinned,
  isPlacementToolbarHovered,
  isPendingPlacementToolbarVisible,
  pendingPlacementSizeLabel,
  pendingPlacementToolbarStyle,
  startPlacementFromPalette: beginPlacementFromPalette,
  updatePendingPlacementPosition,
  togglePendingPlacementPin,
  placePendingPlacement: placePendingPlacementWithName,
  clearPendingPlacement,
  cancelPendingPlacement,
  rotatePendingPlacement,
  cyclePendingPlacementSize,
} = usePendingPlacement({
  $q,
  gardenStore,
  captureItems,
  isMobileCaptureMode,
  activeCanvasTool,
  isCapturePanelOpen,
  addArea,
})

let placementFeedbackTimeoutId = null

function clearPlacementFeedback() {
  placementFeedback.value = ''

  if (placementFeedbackTimeoutId) {
    clearTimeout(placementFeedbackTimeoutId)
    placementFeedbackTimeoutId = null
  }
}

function showPlacementFeedback(message) {
  clearPlacementFeedback()
  placementFeedback.value = message
  placementFeedbackTimeoutId = setTimeout(() => {
    placementFeedback.value = ''
    placementFeedbackTimeoutId = null
  }, 1800)
}

function startPlacementFromPalette(item) {
  clearPlacementFeedback()
  beginPlacementFromPalette(item)
}

onBeforeUnmount(() => {
  clearPlacementFeedback()
})

function handleCanvasToolChange(tool) {
  activeCanvasTool.value = tool

  if (activeWorkspaceTab.value === 'layout' && tool === 'measure') {
    isGardenDimensionsOpen.value = true
  }
}

function handleMeasurementRequest() {
  if (activeWorkspaceTab.value === 'layout') {
    isGardenDimensionsOpen.value = true
    return
  }

  isGardenDimensionsOpen.value = true
}

function openAssistant(section = null) {
  assistantSection.value = section ?? assistantTabs.value[0]?.name ?? 'rhythm'
  isAssistantOpen.value = true
}

function toggleCapturePanel() {
  isCapturePanelOpen.value = !isCapturePanelOpen.value

  if (isCapturePanelOpen.value) {
    selectedCaptureGroup.value = selectedCaptureGroup.value ?? 'planting_areas'
    return
  }

  if (!isCapturePanelOpen.value) {
    clearPlacementFeedback()
    clearPendingPlacement()
  }
}

function closeCapturePanel() {
  isCapturePanelOpen.value = false
  clearPlacementFeedback()
  cancelPendingPlacement()
}

function toggleCaptureGroup(groupValue) {
  selectedCaptureGroup.value = selectedCaptureGroup.value === groupValue ? null : groupValue
}

function buildCaptureZoneName(template, nextBed) {
  if (!template.namePrefix || !nextBed?.name) {
    return nextBed?.name ?? ''
  }

  const sequenceNumber = nextBed.name.split(' ').pop()
  return `${template.namePrefix} ${sequenceNumber}`
}

function placePendingPlacement() {
  const nextBed = placePendingPlacementWithName(buildCaptureZoneName)

  if (nextBed && !isMobileCaptureMode.value && activeWorkspaceTab.value === 'layout') {
    showPlacementFeedback('Area added')
    isCapturePanelOpen.value = true
  }
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
  propagationStore.assignBatchToTray(demand.batchId, tray.id, demand.remainingCells)
}

const {
  guidedTransplantRequest,
  startGuidedTransplant: createGuidedTransplantRequest,
  finishGuidedTransplant,
  cancelGuidedTransplant,
} = useGuidedTransplant({
  planningStore,
  propagationStore,
})

function startGuidedTransplant(assignment) {
  const request = createGuidedTransplantRequest(assignment)

  if (!request?.areaId) {
    return
  }

  activeWorkspaceTab.value = 'current'
  gardenStore.setSelectedBed(request.areaId)
}

function markTaskTransplanted(task) {
  if (!task?.batchId || !task?.cropPlanId) {
    return
  }

  planningStore.incrementInGardenCount(task.cropPlanId, task.quantity)
  propagationStore.markReadyAssignmentsTransplanted(task.batchId)
  scheduleStore.setTaskDone(task.id, true)
}

const { plannerTasks, completedTaskCount } = usePlannerTasks(scheduleStore)
const trayDemands = computed(() => propagationStore.indoorStartDemands)
const traySummaries = computed(() => propagationStore.traySummaries)
const todayDashboard = useTodayDashboard({
  scheduleStore,
  plannerTasks,
  traySummaries,
  trayDemands,
})
const {
  assistantDefaultSection,
  assistantRailButtons,
  assistantTabs,
  assistantAlertCount,
} = useAssistantUiModel(todayDashboard)
</script>

<style scoped>
.planner-page {
  background:
    linear-gradient(180deg, #f4f1e6 0%, #eef5ea 100%);
}

.planner-page--layout {
  background:
    linear-gradient(180deg, #f4f1e6 0%, #eef5ea 100%);
}

.planner-page--plan {
  background:
    linear-gradient(180deg, #f6efe0 0%, #f8f3e7 100%);
}

.planner-page--current {
  background:
    linear-gradient(180deg, #edf6f1 0%, #e5f0ea 100%);
}

.planner-shell {
  width: 100%;
  min-height: 100vh;
}

.planner-shell--canvas {
  padding: 0;
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

.workspace-panels {
  border-radius: 0;
}

.workspace-panel {
  padding: 0;
}

.planner-shell--immersive {
  min-height: 100vh;
}

.simulation-screen {
  display: grid;
  gap: 0;
}

.simulation-stage {
  position: relative;
  min-height: 100vh;
}

.simulation-stage__canvas-wrap {
  position: sticky;
  top: 0;
  z-index: 12;
  height: 100vh;
  height: 100dvh;
}

.simulation-stage__canvas-wrap :deep(.planner-viewport) {
  height: 100%;
  min-height: 100%;
}

.simulation-stage__canvas-wrap :deep(.planner-svg) {
  min-height: 100%;
}

.simulation-shell-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.simulation-shell-overlay > * {
  pointer-events: auto;
}

.simulation-stage__topbar {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 4;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.simulation-stage__topbar > * {
  pointer-events: auto;
}

.simulation-stage__nav-toggle {
  box-shadow:
    0 12px 24px rgba(37, 51, 34, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.simulation-stage__topbar--plan .simulation-stage__nav-toggle,
.planner-page--plan .simulation-stage__topbar-actions :deep(.q-btn),
.planner-page--plan .simulation-stage__topbar-actions :deep(.q-chip) {
  box-shadow: 0 12px 24px rgba(137, 101, 34, 0.16);
}

.simulation-stage__topbar--current .simulation-stage__nav-toggle,
.planner-page--current .simulation-stage__topbar-actions :deep(.q-btn),
.planner-page--current .simulation-stage__topbar-actions :deep(.q-chip) {
  box-shadow: 0 12px 24px rgba(34, 103, 87, 0.16);
}

.simulation-stage__topbar-actions {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.simulation-stage__topbar-actions :deep(.q-btn),
.simulation-stage__topbar-actions :deep(.q-chip) {
  box-shadow:
    0 10px 24px rgba(37, 51, 34, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(97, 111, 86, 0.16);
}

.simulation-stage__topbar-panel {
  display: grid;
  grid-template-columns: auto auto auto;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 10px 10px 12px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(249, 244, 229, 0.94), rgba(235, 225, 203, 0.88));
  border: 1px solid rgba(95, 110, 84, 0.22);
  box-shadow:
    0 18px 30px rgba(37, 51, 34, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    inset 0 -1px 0 rgba(92, 107, 86, 0.12);
  backdrop-filter: blur(14px);
}

.simulation-stage__topbar-panel :deep(.today-widget) {
  box-shadow: none;
}

.simulation-stage__assistant-rail {
  position: absolute;
  top: 184px;
  right: 12px;
  z-index: 4;
  display: grid;
  gap: 10px;
  padding: 10px 9px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(249, 244, 229, 0.96), rgba(235, 225, 203, 0.9));
  border: 1px solid rgba(95, 110, 84, 0.26);
  box-shadow:
    0 18px 30px rgba(37, 51, 34, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    inset 0 -1px 0 rgba(92, 107, 86, 0.12);
  backdrop-filter: blur(14px);
}

.simulation-stage__assistant-rail::before {
  content: '';
  position: absolute;
  left: 9px;
  right: 9px;
  top: 6px;
  height: 1px;
  background: rgba(255, 255, 255, 0.55);
}

.simulation-stage__assistant-rail::after {
  content: '';
  position: absolute;
  left: 9px;
  right: 9px;
  bottom: 6px;
  height: 1px;
  background: rgba(92, 107, 86, 0.14);
}

.simulation-stage__assistant-rail :deep(.q-btn) {
  min-width: 52px;
  min-height: 52px;
  box-shadow:
    0 10px 18px rgba(37, 51, 34, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(97, 111, 86, 0.18);
}

.planner-page--plan .simulation-stage__assistant-rail :deep(.q-btn) {
  box-shadow:
    0 10px 18px rgba(137, 101, 34, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.planner-page--current .simulation-stage__assistant-rail :deep(.q-btn) {
  box-shadow:
    0 10px 18px rgba(34, 103, 87, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

@media (max-width: 1023px) {
  .planner-header {
    align-items: start;
  }

  .planner-header__meta {
    padding-bottom: 0;
  }
}

@media (max-width: 680px) {
  .simulation-stage {
    min-height: 100vh;
    min-height: 100dvh;
  }

  .simulation-stage__canvas-wrap {
    height: 100vh;
    height: 100dvh;
  }

  .simulation-stage__topbar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 6px 8px;
    align-items: start;
  }

  .simulation-stage__topbar-panel {
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    width: min(100%, calc(100vw - 16px));
    padding: 6px;
    gap: 6px 8px;
  }

  .simulation-stage__today-toggle,
  .simulation-stage__today-card {
    grid-column: 1;
    grid-row: 1 / span 2;
    align-self: start;
  }

  .simulation-stage__today-card {
    width: min(138px, calc(100vw - 16px));
  }

  .simulation-stage__nav-toggle {
    grid-column: 2;
    grid-row: 1;
    width: 100%;
    transform: none;
  }

  .simulation-stage__topbar-actions {
    grid-column: 2;
    grid-row: 2;
    width: 100%;
    justify-items: stretch;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

.simulation-stage__chip-icon {
  margin-right: 6px;
}

.simulation-stage__grid-trigger {
  min-width: 0;
}

.simulation-stage__grid-trigger-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.simulation-stage__grid-menu {
  min-width: 140px;
}

  .simulation-stage__topbar-actions :deep(.q-btn),
  .simulation-stage__topbar-actions :deep(.q-chip) {
    width: 100%;
    min-width: 0;
  }

  .simulation-stage__assistant-rail {
    top: 126px;
    right: 8px;
    bottom: auto;
    gap: 8px;
    padding: 8px 7px;
  }

  .simulation-stage__assistant-rail :deep(.q-btn) {
    min-width: 48px;
    min-height: 48px;
  }
}

</style>
