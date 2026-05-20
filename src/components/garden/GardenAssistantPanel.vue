<template>
  <q-dialog
    :model-value="open"
    :position="position"
    @update:model-value="$emit('update:open', $event)"
  >
    <q-card class="assistant-panel" :class="{ 'assistant-panel--mobile': isMobileCaptureMode }">
      <q-card-section class="assistant-panel__header">
        <div>
          <div class="text-overline text-positive">Garden Assistant</div>
          <div class="assistant-panel__title">Rhythm, tasks, weather, trays, and alerts</div>
        </div>

        <q-btn flat round dense icon="close" @click="$emit('update:open', false)" />
      </q-card-section>

      <q-tabs
        :model-value="assistantSection"
        dense
        align="left"
        active-color="positive"
        indicator-color="positive"
        class="assistant-panel__tabs"
        @update:model-value="$emit('update:section', $event)"
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

      <q-tab-panels
        :model-value="assistantSection"
        animated
        class="assistant-panel__panels bg-transparent"
        @update:model-value="$emit('update:section', $event)"
      >
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
            @refresh-weather="$emit('refresh-weather')"
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
            @toggle-task="$emit('toggle-task', $event)"
            @focus-task="$emit('focus-task', $event)"
            @mark-transplanted="$emit('mark-transplanted', $event)"
          />
        </q-tab-panel>

        <q-tab-panel name="trays" class="assistant-panel__panel">
          <PropagationTrayBoard
            :demands="trayDemands"
            :trays="traySummaries"
            :tray-options="trayOptions"
            :tray-status-options="trayStatusOptions"
            :assignment-status-options="assignmentStatusOptions"
            @create-tray="$emit('create-tray', $event)"
            @assign-demand="$emit('assign-demand', $event)"
            @quick-assign-new-tray="$emit('quick-assign-new-tray', $event)"
            @guided-transplant="$emit('guided-transplant', $event)"
            @remove-assignment="$emit('remove-assignment', $event)"
            @update-tray-status="$emit('update-tray-status', $event)"
            @update-assignment-status="$emit('update-assignment-status', $event)"
          />
        </q-tab-panel>

        <q-tab-panel name="alerts" class="assistant-panel__panel">
          <q-list separator bordered class="assistant-alerts">
            <q-item v-for="item in alertItems" :key="item.id">
              <q-item-section>
                <q-item-label>{{ item.title }}</q-item-label>
                <q-item-label caption>{{ item.meta }}</q-item-label>
                <q-item-label v-if="item.note" caption>{{ item.note }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="!alertItems.length">
              <q-item-section>
                <q-item-label>No active alerts.</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import PlannerTaskList from 'src/components/garden/PlannerTaskList.vue'
import PropagationTrayBoard from 'src/components/garden/PropagationTrayBoard.vue'
import TodayDashboardCard from 'src/components/garden/TodayDashboardCard.vue'
import WeatherSummaryCard from 'src/components/garden/WeatherSummaryCard.vue'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  isMobileCaptureMode: {
    type: Boolean,
    required: true,
  },
  assistantSection: {
    type: String,
    required: true,
  },
  assistantTabs: {
    type: Array,
    required: true,
  },
  scheduleStore: {
    type: Object,
    required: true,
  },
  todayDashboard: {
    type: Object,
    required: true,
  },
  plannerTasks: {
    type: Array,
    required: true,
  },
  completedTaskCount: {
    type: Number,
    required: true,
  },
  trayDemands: {
    type: Array,
    required: true,
  },
  traySummaries: {
    type: Array,
    required: true,
  },
  trayOptions: {
    type: Array,
    required: true,
  },
  trayStatusOptions: {
    type: Array,
    required: true,
  },
  assignmentStatusOptions: {
    type: Array,
    required: true,
  },
})

defineEmits([
  'update:open',
  'update:section',
  'refresh-weather',
  'toggle-task',
  'focus-task',
  'mark-transplanted',
  'create-tray',
  'assign-demand',
  'quick-assign-new-tray',
  'guided-transplant',
  'remove-assignment',
  'update-tray-status',
  'update-assignment-status',
])

const alertItems = computed(() => (
  [...props.todayDashboard.weatherRisks, ...props.todayDashboard.dueToday].slice(0, 8)
))
</script>

<style scoped>
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
</style>
