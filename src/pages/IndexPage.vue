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
              :tone="activeWorkspaceTab"
              map-mode
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
                { label: 'Layout', value: 'layout' },
                { label: 'Plan', value: 'plan' },
                { label: 'Current', value: 'current' },
              ]"
            />

            <div class="simulation-stage__topbar-actions">
              <q-chip dense :color="workspaceTheme.chipColor" text-color="white" :icon="workspaceTheme.icon">
                {{ activeToolLabel }}
              </q-chip>
              <q-btn-dropdown
                unelevated
                rounded
                color="white"
                text-color="grey-8"
                icon="straighten"
                :label="selectedGridScaleLabel"
              >
                <q-list dense>
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
              </q-btn-dropdown>
            </div>
          </div>

          <div v-if="activeWorkspaceTab === 'layout' && !pendingPlacement" class="simulation-stage__capture-launcher">
            <q-btn
              rounded
              unelevated
              :color="workspaceTheme.accentColor"
              text-color="white"
              icon="explore"
              :label="isCapturePanelOpen ? 'Close Build' : 'Build'"
              @click="toggleCapturePanel"
            >
              <q-tooltip>Open the garden build menu</q-tooltip>
            </q-btn>
          </div>

          <div
            v-if="activeWorkspaceTab === 'layout' && isCapturePanelOpen && !pendingPlacement"
            class="simulation-stage__capture-sheet"
          >
            <q-card flat bordered class="capture-sheet" :class="{ 'capture-sheet--mobile': isMobileCaptureMode }">
              <q-card-section class="capture-sheet__header">
                <div class="capture-sheet__title-block">
                  <div class="capture-sheet__title">Build</div>
                  <div class="capture-sheet__caption">Pick a set, then drop a piece onto the map.</div>
                </div>
                <q-btn flat round dense icon="close" @click="closeCapturePanel" />
              </q-card-section>

              <q-card-section class="capture-sheet__body">
                <div
                  v-for="group in captureGroups"
                  :key="group.value"
                  class="capture-sheet__group-block"
                >
                  <q-btn
                    no-caps
                    rounded
                    unelevated
                    color="white"
                    text-color="grey-8"
                    class="capture-sheet__group-btn"
                    :class="[
                      `capture-sheet__group-btn--${group.value}`,
                      { 'capture-sheet__group-btn--active': selectedCaptureGroup === group.value },
                    ]"
                    @click="toggleCaptureGroup(group.value)"
                  >
                    <div class="capture-sheet__button-row">
                      <BuildMenuGlyph :kind="group.value" />
                      <div class="capture-sheet__type-copy capture-sheet__type-copy--group">
                        <span>{{ group.label }}</span>
                      </div>
                      <q-icon
                        name="expand_more"
                        class="capture-sheet__expand-icon"
                        :class="{ 'capture-sheet__expand-icon--open': selectedCaptureGroup === group.value }"
                      />
                    </div>
                  </q-btn>

                  <q-slide-transition>
                    <div v-if="selectedCaptureGroup === group.value" class="capture-sheet__subgrid">
                      <q-btn
                        v-for="item in getCaptureItemsByGroup(group.value)"
                        :key="item.value"
                        no-caps
                        rounded
                        unelevated
                        color="white"
                        text-color="grey-8"
                        class="capture-sheet__type-btn"
                        :class="`capture-sheet__type-btn--${group.value}`"
                        @click="startPlacementFromPalette(item)"
                      >
                        <div class="capture-sheet__button-row capture-sheet__button-row--item">
                          <BuildMenuGlyph :kind="item.value" />
                          <div class="capture-sheet__type-copy">
                            <span>{{ item.label }}</span>
                            <small>{{ getCaptureItemSummary(item) }}</small>
                          </div>
                        </div>
                      </q-btn>
                    </div>
                  </q-slide-transition>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div
            v-if="activeWorkspaceTab === 'layout' && isPendingPlacementToolbarVisible"
            class="simulation-stage__placement-toolbar"
            :style="pendingPlacementToolbarStyle"
            @mouseenter="isPlacementToolbarHovered = true"
            @mouseleave="isPlacementToolbarHovered = false"
            @pointerdown.stop
            @pointermove.stop
          >
            <q-card flat bordered class="placement-toolbar" :class="{ 'placement-toolbar--mobile': isMobileCaptureMode }">
              <q-card-section class="placement-toolbar__section">
                <div class="placement-toolbar__summary">
                  <div class="placement-toolbar__title">{{ pendingPlacement.name }}</div>
                  <div class="placement-toolbar__meta">{{ pendingPlacementSizeLabel }}</div>
                </div>

                <div class="placement-toolbar__actions">
                  <q-btn round unelevated color="white" text-color="grey-8" icon="rotate_90_degrees_cw" @click="rotatePendingPlacement">
                    <q-tooltip>Rotate</q-tooltip>
                  </q-btn>
                  <q-btn round unelevated color="white" text-color="grey-8" icon="zoom_out_map" @click="cyclePendingPlacementSize">
                    <q-tooltip>Edit size</q-tooltip>
                  </q-btn>
                  <q-btn round unelevated :color="workspaceTheme.accentColor" text-color="white" icon="done" @click="placePendingPlacement">
                    <q-tooltip>Place</q-tooltip>
                  </q-btn>
                  <q-btn round unelevated color="white" text-color="grey-8" icon="close" @click="cancelPendingPlacement">
                    <q-tooltip>Cancel</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <GardenCapturePalette
            :active-tool="activeCanvasTool"
            :zoom="gardenStore.viewport.zoom"
            :primary-tools="palettePrimaryTools"
            :add-options="paletteAddOptions"
            :accent-color="workspaceTheme.accentColor"
            @add-bed="addArea"
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @change-tool="handleCanvasToolChange"
          />

          <div class="simulation-stage__assistant-rail">
            <q-btn round unelevated color="dark" text-color="white" icon="smart_toy" @click="openAssistant(assistantDefaultSection)">
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
              :icon="button.icon"
              @click="openAssistant(button.section)"
            >
              <q-tooltip>{{ button.tooltip }}</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-dialog
          v-model="isAssistantOpen"
          :position="assistantPosition"
        >
          <q-card class="assistant-panel" :class="{ 'assistant-panel--mobile': isMobileCaptureMode }">
            <q-card-section class="assistant-panel__header">
              <div>
                <div class="text-overline text-positive">Garden Assistant</div>
                <div class="assistant-panel__title">Rhythm, tasks, weather, trays, and alerts</div>
              </div>

              <q-btn flat round dense icon="close" @click="isAssistantOpen = false" />
            </q-card-section>

            <q-tabs
              v-model="assistantSection"
              dense
              align="left"
              active-color="positive"
              indicator-color="positive"
              class="assistant-panel__tabs"
            >
              <q-tab
                v-for="tab in assistantTabs"
                :key="tab.name"
                :name="tab.name"
                :icon="tab.icon"
                :label="tab.label"
              />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="assistantSection" animated class="assistant-panel__panels bg-transparent">
              <q-tab-panel name="weather" class="assistant-panel__panel">
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
              </q-tab-panel>

              <q-tab-panel name="rhythm" class="assistant-panel__panel">
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
              </q-tab-panel>

              <q-tab-panel name="tasks" class="assistant-panel__panel">
                <PlannerTaskList
                  :tasks="plannerTasks"
                  :completed-count="completedTaskCount"
                  @toggle-task="scheduleStore.setTaskDone($event.taskId, $event.done)"
                  @focus-task="focusTaskArea"
                  @mark-transplanted="markTaskTransplanted"
                />
              </q-tab-panel>

              <q-tab-panel name="trays" class="assistant-panel__panel">
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
              </q-tab-panel>

              <q-tab-panel name="alerts" class="assistant-panel__panel">
                <q-list separator bordered class="assistant-alerts">
                  <q-item v-for="item in [...todayDashboard.weatherRisks, ...todayDashboard.dueToday].slice(0, 8)" :key="item.id">
                    <q-item-section>
                      <q-item-label>{{ item.title }}</q-item-label>
                      <q-item-label caption>{{ item.meta }}</q-item-label>
                      <q-item-label v-if="item.note" caption>{{ item.note }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="![...todayDashboard.weatherRisks, ...todayDashboard.dueToday].length">
                    <q-item-section>
                      <q-item-label>No active alerts.</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-tab-panel>
            </q-tab-panels>
          </q-card>
        </q-dialog>

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
import { useQuasar } from 'quasar'
import BuildMenuGlyph from 'src/components/garden/BuildMenuGlyph.vue'
import GardenCanvas from 'src/components/garden/GardenCanvas.vue'
import GardenCapturePalette from 'src/components/garden/GardenCapturePalette.vue'
import GardenDimensionsDialog from 'src/components/garden/GardenDimensionsDialog.vue'
import PropagationTrayBoard from 'src/components/garden/PropagationTrayBoard.vue'
import PlannerTaskList from 'src/components/garden/PlannerTaskList.vue'
import TodayDashboardCard from 'src/components/garden/TodayDashboardCard.vue'
import WeatherSummaryCard from 'src/components/garden/WeatherSummaryCard.vue'
import GardenSetupForm from 'src/components/garden/GardenSetupForm.vue'
import { useGardenStore } from 'src/stores/garden-store'
import { usePlanningStore } from 'src/stores/planning-store'
import {
  ASSIGNMENT_STATUS_OPTIONS,
  TRAY_STATUS_OPTIONS,
  usePropagationStore,
} from 'src/stores/propagation-store'
import { useScheduleStore } from 'src/stores/schedule-store'
import { bedSupportsHeight, clamp, feetToPixels, getBedFootprint, pixelsToFeet } from 'src/utils/garden'

const $q = useQuasar()
const gardenStore = useGardenStore()
const planningStore = usePlanningStore()
const propagationStore = usePropagationStore()
const scheduleStore = useScheduleStore()
const isGardenDimensionsOpen = ref(false)
const plantingDialogRequest = ref(null)
const guidedTransplantRequest = ref(null)
const activeWorkspaceTab = ref('layout')
const isMobileCaptureMode = computed(() => $q.screen.lt.md)
const activeCanvasTool = ref('move')
const selectedGridScale = ref('six_in')
const isCapturePanelOpen = ref(false)
const selectedCaptureGroup = ref(null)
const pendingPlacement = ref(null)
const isPendingPlacementPinned = ref(false)
const isPlacementToolbarHovered = ref(false)
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
const palettePrimaryTools = computed(() => (
  activeWorkspaceTab.value === 'layout'
    ? [
        { value: 'measure', icon: 'straighten', label: 'Measure the garden footprint' },
      ]
    : activeWorkspaceTab.value === 'plan'
      ? [
          { value: 'plant', icon: 'eco', label: 'Plan what grows in each zone' },
          { value: 'measure', icon: 'straighten', label: 'Check spacing and garden footprint' },
        ]
      : [
          { value: 'plant', icon: 'spa', label: 'Update what is in the garden now' },
          { value: 'measure', icon: 'straighten', label: 'Check spacing and garden footprint' },
        ]
))
const paletteAddOptions = computed(() => (
  []
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
            ? (activeWorkspaceTab.value === 'current' ? 'Current Garden' : 'Plant')
            : activeCanvasTool.value === 'add'
              ? (activeWorkspaceTab.value === 'layout' ? 'Add Zone' : 'Move')
              : activeWorkspaceTab.value === 'layout'
                ? 'Capture'
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
const assistantDefaultSection = computed(() => 'rhythm')
const assistantRailButtons = computed(() => ([
  { section: 'rhythm', icon: 'event_repeat', tooltip: 'Open Garden Rhythm' },
  { section: 'tasks', icon: 'task_alt', tooltip: 'Open Tasks' },
  { section: 'weather', icon: 'cloud', tooltip: 'Open Weather' },
  { section: 'trays', icon: 'spa', tooltip: 'Open Trays' },
  { section: 'alerts', icon: 'notification_important', tooltip: 'Open Alerts' },
]))
const captureGroups = [
  { value: 'planting_areas', label: 'Planting Areas', icon: 'eco' },
  { value: 'structures', label: 'Structures', icon: 'home_work' },
  { value: 'landmarks', label: 'Landmarks', icon: 'place' },
]
const captureItems = [
  { value: 'raised', label: 'Raised Bed', icon: 'view_in_ar', group: 'planting_areas', storeType: 'raised', renderTheme: 'planting', widthFeet: 4, heightFeet: 8, bedHeightInches: 18, namePrefix: null, sizePresets: [{ widthFeet: 4, heightFeet: 8 }, { widthFeet: 3, heightFeet: 6 }, { widthFeet: 2, heightFeet: 4 }] },
  { value: 'regular', label: 'In-Ground Bed', icon: 'crop_square', group: 'planting_areas', storeType: 'regular', renderTheme: 'planting', widthFeet: 4, heightFeet: 8, bedHeightInches: 0, namePrefix: null, sizePresets: [{ widthFeet: 4, heightFeet: 8 }, { widthFeet: 3, heightFeet: 6 }, { widthFeet: 2, heightFeet: 4 }] },
  { value: 'pot', label: 'Pot', icon: 'radio_button_unchecked', group: 'planting_areas', storeType: 'pot', renderTheme: 'planting', widthFeet: 2, heightFeet: 2, bedHeightInches: 16, namePrefix: null, sizePresets: [{ widthFeet: 2, heightFeet: 2 }, { widthFeet: 3, heightFeet: 3 }] },
  { value: 'greenhouse', label: 'Greenhouse', icon: 'home_work', group: 'structures', storeType: 'regular', renderTheme: 'structure', widthFeet: 8, heightFeet: 10, bedHeightInches: 0, namePrefix: 'Greenhouse', sizePresets: [{ widthFeet: 8, heightFeet: 10 }, { widthFeet: 10, heightFeet: 12 }] },
  { value: 'hoophouse', label: 'Hoophouse', icon: 'roofing', group: 'structures', storeType: 'regular', renderTheme: 'structure', widthFeet: 10, heightFeet: 14, bedHeightInches: 0, namePrefix: 'Hoophouse', sizePresets: [{ widthFeet: 10, heightFeet: 14 }, { widthFeet: 8, heightFeet: 12 }] },
  { value: 'entrance', label: 'Entrance', icon: 'login', group: 'landmarks', storeType: 'regular', renderTheme: 'landmark', widthFeet: 3, heightFeet: 1, bedHeightInches: 0, namePrefix: 'Entrance', renderKind: 'entrance', placementMode: 'border', borderEdge: 'bottom', sizePresets: [{ widthFeet: 3, heightFeet: 1 }, { widthFeet: 4, heightFeet: 1 }] },
  { value: 'fence', label: 'Fence / Wall', icon: 'fence', group: 'landmarks', storeType: 'regular', renderTheme: 'landmark', widthFeet: 12, heightFeet: 1, bedHeightInches: 0, namePrefix: 'Fence', renderKind: 'line', sizePresets: [{ widthFeet: 8, heightFeet: 1 }, { widthFeet: 12, heightFeet: 1 }, { widthFeet: 16, heightFeet: 1 }] },
]
const pendingPlacementTemplate = computed(() => (
  captureItems.find((item) => item.value === pendingPlacement.value?.value) ?? null
))
const isPendingPlacementToolbarVisible = computed(() => (
  Boolean(pendingPlacement.value) && (isMobileCaptureMode.value || isPendingPlacementPinned.value)
))
const pendingPlacementSizeLabel = computed(() => (
  pendingPlacement.value
    ? `${pendingPlacement.value.widthFeet} x ${pendingPlacement.value.heightFeet} ft`
      + (bedSupportsHeight(pendingPlacement.value.type) ? ` · ${pendingPlacement.value.bedHeightInches} in` : '')
    : ''
))
function getPendingPlacementToolbarMetrics() {
  if (!pendingPlacement.value) {
    return null
  }

  const toolbarWidth = isMobileCaptureMode.value ? 248 : 286
  const toolbarHeight = isMobileCaptureMode.value ? 112 : 76
  const edgePadding = 12
  const offset = 18
  const footprint = getBedFootprint(pendingPlacement.value)
  const { zoom, panX, panY } = gardenStore.viewport
  const left = panX + feetToPixels(pendingPlacement.value.xFeet) * zoom
  const top = panY + feetToPixels(pendingPlacement.value.yFeet) * zoom
  const width = feetToPixels(footprint.widthFeet) * zoom
  const height = feetToPixels(footprint.heightFeet) * zoom
  const screenWidth = $q.screen.width
  const screenHeight = $q.screen.height
  const shouldFlipLeft = left + width + offset + toolbarWidth > screenWidth - edgePadding
  const unclampedLeft = shouldFlipLeft
    ? left - toolbarWidth - offset
    : left + width + offset
  const unclampedTop = top + (height / 2) - (toolbarHeight / 2)

  return {
    width: toolbarWidth,
    height: toolbarHeight,
    left: clamp(unclampedLeft, edgePadding, Math.max(screenWidth - toolbarWidth - edgePadding, edgePadding)),
    top: clamp(unclampedTop, edgePadding, Math.max(screenHeight - toolbarHeight - edgePadding, edgePadding)),
  }
}

const pendingPlacementToolbarStyle = computed(() => {
  const toolbarMetrics = getPendingPlacementToolbarMetrics()

  if (!toolbarMetrics) {
    return {}
  }

  return {
    left: `${toolbarMetrics.left}px`,
    top: `${toolbarMetrics.top}px`,
  }
})

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

watch(
  () => [gardenStore.widthFeet, gardenStore.lengthFeet],
  ([widthFeet, lengthFeet]) => {
    dimensions.widthFeet = widthFeet
    dimensions.lengthFeet = lengthFeet
  },
)

watch(activeWorkspaceTab, (nextTab) => {
  if ((nextTab === 'plan' || nextTab === 'current') && activeCanvasTool.value === 'add') {
    activeCanvasTool.value = 'move'
  }

  if (nextTab === 'layout' && activeCanvasTool.value === 'plant') {
    activeCanvasTool.value = 'move'
  }

  if (nextTab !== 'layout') {
    isCapturePanelOpen.value = false
    isPendingPlacementPinned.value = false
    pendingPlacement.value = null
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

  if (!isCapturePanelOpen.value) {
    selectedCaptureGroup.value = null
    pendingPlacement.value = null
  }
}

function closeCapturePanel() {
  isCapturePanelOpen.value = false
  selectedCaptureGroup.value = null
  cancelPendingPlacement()
}

function toggleCaptureGroup(groupValue) {
  selectedCaptureGroup.value = selectedCaptureGroup.value === groupValue ? null : groupValue
}

function getCaptureItemsByGroup(groupValue) {
  return captureItems.filter((item) => item.group === groupValue)
}

function getCaptureItemSummary(item) {
  const sizeLabel = `${item.widthFeet} x ${item.heightFeet} ft`
  return bedSupportsHeight(item.storeType) ? `${sizeLabel} · ${item.bedHeightInches} in` : sizeLabel
}

function buildCaptureZoneName(template, nextBed) {
  if (!template.namePrefix || !nextBed?.name) {
    return nextBed?.name ?? ''
  }

  const sequenceNumber = nextBed.name.split(' ').pop()
  return `${template.namePrefix} ${sequenceNumber}`
}

function startPlacementFromPalette(item) {
  const defaultPosition = getDefaultPendingPlacementPosition(item)
  isPendingPlacementPinned.value = isMobileCaptureMode.value
  isPlacementToolbarHovered.value = false
  pendingPlacement.value = {
    ...item,
    type: item.storeType,
    name: item.label,
    xFeet: defaultPosition.xFeet,
    yFeet: defaultPosition.yFeet,
    rotationDegrees: 0,
    activePresetIndex: 0,
  }
  isCapturePanelOpen.value = false
  selectedCaptureGroup.value = null
  activeCanvasTool.value = 'move'
}

function isPointerNearPendingPlacementToolbar(clientX, clientY) {
  if (
    isMobileCaptureMode.value
    || !isPendingPlacementToolbarVisible.value
    || clientX === undefined
    || clientY === undefined
  ) {
    return false
  }

  const toolbarMetrics = getPendingPlacementToolbarMetrics()

  if (!toolbarMetrics) {
    return false
  }

  const padding = 20
  return clientX >= toolbarMetrics.left - padding
    && clientX <= toolbarMetrics.left + toolbarMetrics.width + padding
    && clientY >= toolbarMetrics.top - padding
    && clientY <= toolbarMetrics.top + toolbarMetrics.height + padding
}

function updatePendingPlacementPosition(payload) {
  const gardenPoint = payload?.gardenPoint ?? payload

  if (
    !pendingPlacement.value
    || !gardenPoint
    || (!isMobileCaptureMode.value && isPendingPlacementPinned.value)
    || (!$q.screen.lt.md && (isPlacementToolbarHovered.value || isPointerNearPendingPlacementToolbar(payload?.clientX, payload?.clientY)))
  ) {
    return
  }

  pendingPlacement.value = constrainPendingPlacement(pendingPlacement.value, gardenPoint)
}

function togglePendingPlacementPin(payload = null) {
  if (!pendingPlacement.value || isMobileCaptureMode.value) {
    return
  }

  if (!isPendingPlacementPinned.value) {
    const gardenPoint = payload?.gardenPoint ?? payload

    if (gardenPoint) {
      pendingPlacement.value = constrainPendingPlacement(pendingPlacement.value, gardenPoint)
    }
  }

  isPendingPlacementPinned.value = !isPendingPlacementPinned.value
}

function placePendingPlacement() {
  if (!pendingPlacement.value) {
    return
  }

  const nextBed = addArea(pendingPlacement.value.storeType, {
    useExactPlacement: true,
    widthFeet: pendingPlacement.value.widthFeet,
    heightFeet: pendingPlacement.value.heightFeet,
    bedHeightInches: pendingPlacement.value.bedHeightInches,
    xFeet: pendingPlacement.value.xFeet,
    yFeet: pendingPlacement.value.yFeet,
    rotationDegrees: pendingPlacement.value.rotationDegrees,
    renderKind: pendingPlacement.value.renderKind ?? null,
    renderTheme: pendingPlacement.value.renderTheme ?? null,
    placementMode: pendingPlacement.value.placementMode ?? null,
    borderEdge: pendingPlacement.value.borderEdge ?? null,
  })

  if (!nextBed) {
    return
  }

  if (pendingPlacement.value.namePrefix) {
    gardenStore.updateBed(nextBed.id, {
      name: buildCaptureZoneName(pendingPlacement.value, nextBed),
    })
  }

  isPendingPlacementPinned.value = false
  pendingPlacement.value = null
}

function cancelPendingPlacement() {
  isPendingPlacementPinned.value = false
  isPlacementToolbarHovered.value = false
  pendingPlacement.value = null
  activeCanvasTool.value = 'move'
}

function rotatePendingPlacement() {
  if (!pendingPlacement.value) {
    return
  }

  const currentFootprint = getBedFootprint(pendingPlacement.value)
  const centerX = pendingPlacement.value.xFeet + (currentFootprint.widthFeet / 2)
  const centerY = pendingPlacement.value.yFeet + (currentFootprint.heightFeet / 2)
  pendingPlacement.value = constrainPendingPlacement({
    ...pendingPlacement.value,
    rotationDegrees: ((pendingPlacement.value.rotationDegrees ?? 0) + 90) % 360,
  }, { xFeet: centerX, yFeet: centerY }, getNextBorderEdge(pendingPlacement.value.borderEdge))
}

function cyclePendingPlacementSize() {
  if (!pendingPlacement.value || !pendingPlacementTemplate.value?.sizePresets?.length) {
    return
  }

  const currentIndex = Number(pendingPlacement.value.activePresetIndex) || 0
  const nextIndex = (currentIndex + 1) % pendingPlacementTemplate.value.sizePresets.length
  const nextPreset = pendingPlacementTemplate.value.sizePresets[nextIndex]
  const currentFootprint = getBedFootprint(pendingPlacement.value)
  const centerX = pendingPlacement.value.xFeet + (currentFootprint.widthFeet / 2)
  const centerY = pendingPlacement.value.yFeet + (currentFootprint.heightFeet / 2)
  const nextPlacement = {
    ...pendingPlacement.value,
    widthFeet: nextPreset.widthFeet,
    heightFeet: nextPreset.heightFeet,
    activePresetIndex: nextIndex,
  }
  pendingPlacement.value = constrainPendingPlacement(nextPlacement, { xFeet: centerX, yFeet: centerY })
}

function getDefaultPendingPlacementPosition(item) {
  if (item.placementMode === 'border') {
    return constrainPendingPlacement({
      ...item,
      type: item.storeType,
      rotationDegrees: 0,
      borderEdge: item.borderEdge ?? 'bottom',
      xFeet: 0,
      yFeet: 0,
    }, {
      xFeet: gardenStore.widthFeet / 2,
      yFeet: gardenStore.lengthFeet,
    })
  }

  const viewportWidth = $q.screen.width * (isMobileCaptureMode.value ? 0.5 : 0.58)
  const viewportHeight = $q.screen.height * 0.56
  const footprint = getBedFootprint({
    widthFeet: item.widthFeet,
    heightFeet: item.heightFeet,
    rotationDegrees: 0,
  })
  const xFeet = pixelsToFeet((viewportWidth - gardenStore.viewport.panX) / gardenStore.viewport.zoom) - (footprint.widthFeet / 2)
  const yFeet = pixelsToFeet((viewportHeight - gardenStore.viewport.panY) / gardenStore.viewport.zoom) - (footprint.heightFeet / 2)

  return {
    xFeet: clamp(xFeet, 0, Math.max(gardenStore.widthFeet - footprint.widthFeet, 0)),
    yFeet: clamp(yFeet, 0, Math.max(gardenStore.lengthFeet - footprint.heightFeet, 0)),
  }
}

function getNextBorderEdge(currentEdge = 'bottom') {
  const edges = ['bottom', 'left', 'top', 'right']
  const currentIndex = Math.max(edges.indexOf(currentEdge), 0)
  return edges[(currentIndex + 1) % edges.length]
}

function getPlacementCenter(placement) {
  const footprint = getBedFootprint(placement)
  return {
    xFeet: placement.xFeet + (footprint.widthFeet / 2),
    yFeet: placement.yFeet + (footprint.heightFeet / 2),
  }
}

function constrainPendingPlacement(placement, anchorPosition = null, forcedBorderEdge = null) {
  const anchor = anchorPosition ?? getPlacementCenter(placement)

  if (placement.placementMode === 'border') {
    return constrainBorderPlacement(placement, anchor, forcedBorderEdge)
  }

  const footprint = getBedFootprint(placement)
  const maxX = Math.max(gardenStore.widthFeet - footprint.widthFeet, 0)
  const maxY = Math.max(gardenStore.lengthFeet - footprint.heightFeet, 0)

  return {
    ...placement,
    xFeet: clamp(anchor.xFeet - (footprint.widthFeet / 2), 0, maxX),
    yFeet: clamp(anchor.yFeet - (footprint.heightFeet / 2), 0, maxY),
  }
}

function resolveNearestBorderEdge(anchorPosition) {
  const distances = [
    { edge: 'top', distance: Math.abs(anchorPosition.yFeet) },
    { edge: 'bottom', distance: Math.abs(gardenStore.lengthFeet - anchorPosition.yFeet) },
    { edge: 'left', distance: Math.abs(anchorPosition.xFeet) },
    { edge: 'right', distance: Math.abs(gardenStore.widthFeet - anchorPosition.xFeet) },
  ]

  return distances.sort((a, b) => a.distance - b.distance)[0]?.edge ?? 'bottom'
}

function constrainBorderPlacement(placement, anchorPosition, forcedBorderEdge = null) {
  const edge = forcedBorderEdge ?? resolveNearestBorderEdge(anchorPosition)
  const widthFeet = Number(placement.widthFeet) || 3
  const heightFeet = Number(placement.heightFeet) || 1
  const horizontalMaxX = Math.max(gardenStore.widthFeet - widthFeet, 0)
  const verticalMaxY = Math.max(gardenStore.lengthFeet - widthFeet, 0)

  if (edge === 'top' || edge === 'bottom') {
    return {
      ...placement,
      borderEdge: edge,
      rotationDegrees: 0,
      xFeet: clamp(anchorPosition.xFeet - (widthFeet / 2), 0, horizontalMaxX),
      yFeet: edge === 'top' ? 0 : Math.max(gardenStore.lengthFeet - heightFeet, 0),
    }
  }

  return {
    ...placement,
    borderEdge: edge,
    rotationDegrees: 90,
    xFeet: edge === 'left' ? 0 : Math.max(gardenStore.widthFeet - heightFeet, 0),
    yFeet: clamp(anchorPosition.yFeet - (widthFeet / 2), 0, verticalMaxY),
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

const assistantTabs = computed(() => {
  return [
    { name: 'rhythm', label: 'Rhythm', icon: 'event_repeat' },
    { name: 'tasks', label: 'Tasks', icon: 'format_list_bulleted' },
    { name: 'trays', label: 'Trays', icon: 'spa' },
    { name: 'weather', label: 'Weather', icon: 'cloud' },
    { name: 'alerts', label: 'Alerts', icon: 'notification_important' },
  ]
})

const assistantAlertCount = computed(() => (
  todayDashboard.value.weatherRisks.length + todayDashboard.value.dueToday.length
))
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
  gap: 10px;
  pointer-events: none;
}

.simulation-stage__topbar > * {
  pointer-events: auto;
}

.simulation-stage__nav-toggle {
  box-shadow: 0 12px 24px rgba(37, 51, 34, 0.14);
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
  gap: 8px;
  justify-items: end;
}

.simulation-stage__topbar-actions :deep(.q-btn),
.simulation-stage__topbar-actions :deep(.q-chip) {
  box-shadow: 0 10px 24px rgba(37, 51, 34, 0.14);
}

.simulation-stage__assistant-rail {
  position: absolute;
  top: 112px;
  right: 12px;
  z-index: 4;
  display: grid;
  gap: 8px;
}

.simulation-stage__assistant-rail :deep(.q-btn) {
  min-width: 48px;
  min-height: 48px;
  box-shadow: 0 10px 24px rgba(37, 51, 34, 0.14);
}

.planner-page--plan .simulation-stage__assistant-rail :deep(.q-btn) {
  box-shadow: 0 10px 24px rgba(137, 101, 34, 0.16);
}

.planner-page--current .simulation-stage__assistant-rail :deep(.q-btn) {
  box-shadow: 0 10px 24px rgba(34, 103, 87, 0.16);
}

.simulation-stage__capture-launcher {
  position: absolute;
  top: 176px;
  left: 12px;
  z-index: 4;
}

.simulation-stage__capture-launcher :deep(.q-btn) {
  min-height: 46px;
  padding-inline: 16px;
  box-shadow: 0 12px 24px rgba(37, 51, 34, 0.14);
}

.simulation-stage__capture-sheet {
  position: absolute;
  left: 12px;
  right: auto;
  top: 232px;
  z-index: 4;
  max-width: min(228px, calc(100vw - 132px));
}

.simulation-stage__placement-toolbar {
  position: absolute;
  z-index: 4;
}

.assistant-panel {
  width: min(430px, 100vw);
  max-width: 430px;
  height: min(100vh, 100dvh);
  border-radius: 28px 0 0 28px;
  background: rgba(255, 252, 244, 0.98);
}

.assistant-panel--mobile {
  width: 100vw;
  max-width: 100vw;
  height: min(82vh, 82dvh);
  border-radius: 28px 28px 0 0;
}

.assistant-panel__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.assistant-panel__title {
  font-size: 1.1rem;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: #253322;
}

.assistant-panel__tabs {
  padding-inline: 8px;
}

.assistant-panel__panels {
  height: calc(100% - 116px);
  overflow: auto;
}

.assistant-panel__panel {
  padding: 12px;
}

.assistant-alerts {
  border-radius: 16px;
  overflow: hidden;
}

.capture-sheet {
  width: min(228px, calc(100vw - 132px));
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 254, 249, 0.99), rgba(248, 244, 232, 0.98));
  box-shadow: 0 14px 26px rgba(37, 51, 34, 0.14);
  border-color: rgba(99, 118, 91, 0.16);
}

.capture-sheet--mobile {
  width: min(216px, calc(100vw - 108px));
  border-radius: 18px;
}

.capture-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px 4px;
}

.capture-sheet__title-block {
  min-width: 0;
}

.capture-sheet__title {
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #253322;
}

.capture-sheet__caption {
  margin-top: 2px;
  font-size: 0.63rem;
  line-height: 1.3;
  color: #6d7d67;
}

.capture-sheet__body {
  display: grid;
  gap: 7px;
  padding: 2px 10px 10px;
}

.capture-sheet__group-btn {
  justify-content: flex-start;
  min-height: 36px;
  padding: 4px 8px;
  border-radius: 12px;
  width: 100%;
  box-shadow: 0 4px 10px rgba(37, 51, 34, 0.06);
  border: 1px solid rgba(99, 118, 91, 0.08);
}

.capture-sheet__group-block {
  display: grid;
  gap: 4px;
}

.capture-sheet__button-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.capture-sheet__button-row--item {
  gap: 7px;
}

.capture-sheet__expand-icon {
  margin-left: auto;
  font-size: 16px;
  opacity: 0.58;
  transform: rotate(0deg);
  transition: transform 160ms ease, opacity 160ms ease;
}

.capture-sheet__expand-icon--open {
  opacity: 0.88;
  transform: rotate(180deg);
}

.capture-sheet__subgrid {
  display: grid;
  gap: 4px;
  padding-top: 1px;
  padding-left: 12px;
  overflow: hidden;
}

.capture-sheet__type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.capture-sheet__type-btn {
  justify-content: flex-start;
  min-height: 40px;
  padding: 4px 8px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(37, 51, 34, 0.05);
  border: 1px solid rgba(99, 118, 91, 0.08);
}

.capture-sheet__group-btn--active.capture-sheet__group-btn--planting_areas {
  background: linear-gradient(180deg, #8c6842, #775432) !important;
  color: #fffdf8 !important;
  border-color: rgba(104, 71, 39, 0.28);
}

.capture-sheet__group-btn--active.capture-sheet__group-btn--structures {
  background: linear-gradient(180deg, #6f998b, #52786c) !important;
  color: #f7fffc !important;
  border-color: rgba(72, 108, 96, 0.3);
}

.capture-sheet__group-btn--active.capture-sheet__group-btn--landmarks {
  background: linear-gradient(180deg, #8b887d, #706b61) !important;
  color: #fbfaf7 !important;
  border-color: rgba(95, 90, 81, 0.3);
}

.capture-sheet__type-btn--planting_areas {
  background: rgba(148, 106, 63, 0.08) !important;
}

.capture-sheet__type-btn--structures {
  background: rgba(91, 137, 123, 0.1) !important;
}

.capture-sheet__type-btn--landmarks {
  background: rgba(122, 116, 103, 0.1) !important;
}

.capture-sheet__type-copy {
  display: grid;
  justify-items: start;
  text-align: left;
  gap: 1px;
  font-size: 0.72rem;
  line-height: 1.15;
  min-width: 0;
}

.capture-sheet__type-copy--group {
  justify-items: start;
  text-align: left;
  font-size: 0.74rem;
  font-weight: 700;
}

.capture-sheet__type-copy small {
  font-size: 0.6rem;
  color: inherit;
  opacity: 0.68;
}

.placement-toolbar {
  width: min(286px, calc(100vw - 24px));
  border-radius: 20px;
  background: rgba(255, 252, 244, 0.98);
  box-shadow: 0 18px 34px rgba(37, 51, 34, 0.16);
}

.placement-toolbar--mobile {
  width: min(248px, calc(100vw - 24px));
  border-radius: 20px;
}

.placement-toolbar__section {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
}

.placement-toolbar__summary {
  min-width: 0;
}

.placement-toolbar__title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #24321f;
}

.placement-toolbar__meta {
  font-size: 0.8rem;
  color: #61765c;
}

.placement-toolbar__actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  gap: 8px;
}

.placement-toolbar__actions :deep(.q-btn) {
  min-width: 44px;
  min-height: 44px;
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
    gap: 8px;
  }

  .simulation-stage__topbar-actions {
    max-width: 42%;
  }

  .simulation-stage__assistant-rail {
    top: auto;
    bottom: 168px;
  }

  .simulation-stage__capture-launcher {
    top: auto;
    left: 10px;
    bottom: 20px;
  }

  .simulation-stage__capture-sheet {
    left: 10px;
    right: 86px;
    top: 214px;
    max-width: none;
  }

  .capture-sheet {
    width: auto;
  }

  .capture-sheet__type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .placement-toolbar__actions {
    gap: 6px;
  }

  .simulation-stage__nav-toggle {
    transform: scale(0.92);
    transform-origin: top center;
  }
}

</style>
