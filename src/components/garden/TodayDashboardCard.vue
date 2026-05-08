<template>
  <q-card
    flat
    bordered
    class="today-widget"
    :class="{ 'today-widget--expanded': isExpanded }"
    role="button"
    tabindex="0"
    :aria-label="cardAriaLabel"
    @click="toggleExpanded"
    @keydown.enter.prevent="toggleExpanded"
    @keydown.space.prevent="toggleExpanded"
  >
    <q-card-section class="today-widget__shell q-pa-sm">
      <div class="today-widget__header">
        <div class="today-widget__label">TODAY</div>

        <div class="today-widget__alerts">
          <q-btn
            flat
            round
            dense
            size="11px"
            color="grey-8"
            icon="notifications"
            aria-label="Open today action center notifications"
            tabindex="-1"
          />
          <q-badge
            v-if="notificationCount"
            color="negative"
            rounded
            floating
            :label="notificationCount"
            :aria-label="`${notificationCount} notifications`"
          />
        </div>
      </div>

      <div class="today-widget__date">
        <div class="today-widget__day">{{ todayDayLabel }}</div>
        <div class="today-widget__month">{{ todayMonthLabel }}</div>
      </div>

      <div class="today-widget__chips q-mt-sm">
        <q-chip
          v-for="chip in visibleChips"
          :key="chip.key"
          dense
          :outline="!isExpanded"
          :color="chip.color"
          :text-color="isExpanded ? 'white' : chip.color"
          class="today-widget__chip"
          :aria-label="chip.accessibleLabel"
          :title="chip.accessibleLabel"
        >
          <q-icon :name="chip.icon" size="14px" />
          <span v-if="isExpanded" class="q-ml-xs">{{ chip.label }}</span>
          <span v-else class="q-ml-xs">{{ chip.count }}</span>
          <q-tooltip>{{ chip.accessibleLabel }}</q-tooltip>
        </q-chip>
      </div>

      <q-slide-transition>
        <div v-show="isExpanded" class="today-widget__details q-mt-sm">
          <div class="today-widget__summary-row">
            <q-badge rounded color="positive" class="today-widget__summary-badge" label="Due" />
            <span>{{ dueToday.length ? dueToday[0].title : 'The garden is steady today.' }}</span>
          </div>

          <div
            v-if="weatherRisks.length"
            class="today-widget__summary-row"
          >
            <q-badge
              rounded
              color="warning"
              text-color="dark"
              class="today-widget__summary-badge"
              label="Weather"
            />
            <span>{{ weatherRisks[0].title }}</span>
          </div>

          <div
            v-else-if="propagationStatus.length"
            class="today-widget__summary-row"
          >
            <q-badge rounded color="secondary" class="today-widget__summary-badge" label="Tray" />
            <span>{{ propagationStatus[0].title }}</span>
          </div>

          <div
            v-else-if="upcomingThisWeek.length"
            class="today-widget__summary-row"
          >
            <q-badge rounded color="primary" class="today-widget__summary-badge" label="Next" />
            <span>{{ upcomingThisWeek[0].title }}</span>
          </div>

          <div class="today-widget__hint">
            Tap again to tuck this away.
          </div>
        </div>
      </q-slide-transition>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  todayLabel: {
    type: String,
    required: true,
  },
  todayDayLabel: {
    type: String,
    required: true,
  },
  todayMonthLabel: {
    type: String,
    required: true,
  },
  dueToday: {
    type: Array,
    required: true,
  },
  dueTodayMeta: {
    type: String,
    required: true,
  },
  upcomingThisWeek: {
    type: Array,
    required: true,
  },
  upcomingMeta: {
    type: String,
    required: true,
  },
  weatherRisks: {
    type: Array,
    required: true,
  },
  weatherMeta: {
    type: String,
    required: true,
  },
  propagationStatus: {
    type: Array,
    required: true,
  },
  propagationMeta: {
    type: String,
    required: true,
  },
})

const isExpanded = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

const overdueCount = computed(() => (
  props.dueToday.filter((item) => item.chipLabel === 'overdue').length
))

const notificationCount = computed(() => (
  props.weatherRisks.length + overdueCount.value
))

const visibleChips = computed(() => ([
  {
    key: 'due',
    icon: 'task_alt',
    color: props.dueToday.length ? 'positive' : 'grey-6',
    count: props.dueToday.length,
    label: `${props.dueToday.length} Due`,
    accessibleLabel: `${props.dueToday.length} tasks due today`,
  },
  {
    key: 'weather',
    icon: 'cloud',
    color: props.weatherRisks.length ? 'warning' : 'primary',
    count: props.weatherRisks.length,
    label: `${props.weatherRisks.length} Weather`,
    accessibleLabel: `${props.weatherRisks.length} weather risks or alerts`,
  },
  {
    key: 'trays',
    icon: 'spa',
    color: props.propagationStatus.length ? 'secondary' : 'grey-6',
    count: props.propagationStatus.length,
    label: `${props.propagationStatus.length} Trays`,
    accessibleLabel: `${props.propagationStatus.length} propagation items`,
  },
  {
    key: 'overdue',
    icon: 'priority_high',
    color: overdueCount.value ? 'negative' : 'grey-6',
    count: overdueCount.value,
    label: `${overdueCount.value} Overdue`,
    accessibleLabel: `${overdueCount.value} overdue tasks`,
  },
]))

const cardAriaLabel = computed(() => (
  `Today action center for ${props.todayLabel}. `
  + `${props.dueToday.length} due, `
  + `${props.weatherRisks.length} weather, `
  + `${props.propagationStatus.length} tray items, `
  + `${overdueCount.value} overdue.`
))
</script>

<style scoped>
.today-widget {
  width: min(260px, calc(100vw - 20px));
  border-radius: 16px;
  background: rgba(255, 252, 244, 0.9);
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 28px rgba(37, 51, 34, 0.14);
  cursor: pointer;
  user-select: none;
}

.today-widget:focus-visible {
  outline: 2px solid #7bbf58;
  outline-offset: 2px;
}

.today-widget__shell {
  display: grid;
  gap: 4px;
  min-height: 142px;
}

.today-widget__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.today-widget__label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #64785a;
}

.today-widget__alerts {
  position: relative;
}

.today-widget__alerts :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
}

.today-widget__date {
  display: grid;
  gap: 2px;
}

.today-widget__day {
  font-size: 2.15rem;
  line-height: 0.92;
  font-weight: 700;
  letter-spacing: -0.06em;
  color: #24341f;
}

.today-widget__month {
  font-size: 0.78rem;
  font-weight: 600;
  color: #687b60;
}

.today-widget__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.today-widget__chip {
  margin: 0;
  min-height: 26px;
  padding-inline: 6px;
  font-weight: 600;
}

.today-widget__details {
  display: grid;
  gap: 6px;
  padding-top: 2px;
}

.today-widget__summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #42553d;
  line-height: 1.25;
}

.today-widget__summary-badge {
  flex: 0 0 auto;
}

.today-widget__hint {
  padding-top: 2px;
  font-size: 0.72rem;
  color: #778a70;
}

.today-widget--expanded {
  width: min(320px, calc(100vw - 24px));
}
</style>
