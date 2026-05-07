<template>
  <q-card flat bordered class="weather-card">
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">Weather Summary</div>
        <div class="text-caption text-grey-7">
          Current conditions and a simple 7 day outlook for garden decisions.
        </div>
      </div>

      <div class="col-auto">
        <q-btn
          color="secondary"
          outline
          label="Refresh Weather"
          :loading="weatherPending"
          :disable="!canRefresh"
          @click="$emit('refresh-weather')"
        />
      </div>
    </q-card-section>

    <q-card-section class="row q-col-gutter-md q-pt-none">
      <div class="col-12 col-md-7">
        <div class="weather-card__location">
          {{ locationDisplayName || 'Location not set' }}
        </div>

        <div v-if="currentConditions" class="weather-card__current">
          <div class="weather-card__temp">
            {{ formatWhole(currentConditions.temperatureF) }}°
          </div>
          <div class="weather-card__current-meta">
            <div class="weather-card__summary">
              {{ currentConditions.summary || currentConditions.description || 'Current conditions' }}
            </div>
            <div class="text-caption text-grey-7">
              Feels like {{ formatWhole(currentConditions.feelsLikeF) }}° ·
              Wind {{ formatWhole(currentConditions.windMph) }} mph ·
              Humidity {{ formatWhole(currentConditions.humidityPercent) }}%
            </div>
            <div v-if="lastUpdatedAt" class="text-caption text-grey-6 q-mt-xs">
              Updated {{ formatTimestamp(lastUpdatedAt) }}
            </div>
          </div>
        </div>

        <div v-else class="text-caption text-grey-7 q-mt-sm">
          Refresh weather after setting a location to load current conditions.
        </div>

        <div class="weather-card__risk-list q-mt-md">
          <div class="weather-card__risk-item" :class="{ 'weather-card__risk-item--active': hasFreezeRisk }">
            <q-badge :color="hasFreezeRisk ? 'negative' : 'grey-5'" text-color="white">
              Freeze
            </q-badge>
            <span>{{ hasFreezeRisk ? 'Freeze risk in the next 7 days' : 'No freeze risk in the next 7 days' }}</span>
          </div>
          <div class="weather-card__risk-item" :class="{ 'weather-card__risk-item--active': hasHeatRisk }">
            <q-badge :color="hasHeatRisk ? 'warning' : 'grey-5'" text-color="white">
              Heat
            </q-badge>
            <span>{{ hasHeatRisk ? 'Heat stress possible' : 'No heat stress flag in the next 7 days' }}</span>
          </div>
          <div class="weather-card__risk-item" :class="{ 'weather-card__risk-item--active': hasWindRisk }">
            <q-badge :color="hasWindRisk ? 'deep-orange' : 'grey-5'" text-color="white">
              Wind
            </q-badge>
            <span>{{ hasWindRisk ? 'Wind may affect hardening off or transplanting' : 'No high wind flag in the next 7 days' }}</span>
          </div>
          <div class="weather-card__risk-item" :class="{ 'weather-card__risk-item--active': hasActiveWeatherAlerts }">
            <q-badge :color="hasActiveWeatherAlerts ? 'negative' : 'grey-5'" text-color="white">
              Alerts
            </q-badge>
            <span>{{ hasActiveWeatherAlerts ? 'Active weather alerts in the area' : 'No active weather alerts' }}</span>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-5">
        <div class="weather-card__meta-grid">
          <div class="weather-card__meta-item">
            <div class="weather-card__meta-label">USDA Zone</div>
            <div class="weather-card__meta-value">{{ usdaZone || 'Unavailable' }}</div>
          </div>
          <div class="weather-card__meta-item">
            <div class="weather-card__meta-label">Avg Last Frost</div>
            <div class="weather-card__meta-value">{{ averageLastFrostDate || 'Unavailable' }}</div>
          </div>
          <div class="weather-card__meta-item">
            <div class="weather-card__meta-label">Avg First Frost</div>
            <div class="weather-card__meta-value">{{ averageFirstFrostDate || 'Unavailable' }}</div>
          </div>
          <div class="weather-card__meta-item">
            <div class="weather-card__meta-label">Active Alerts</div>
            <div class="weather-card__meta-value">{{ activeAlerts.length }}</div>
          </div>
        </div>
      </div>
    </q-card-section>

    <q-card-section v-if="weatherError" class="q-pt-none">
      <div class="text-negative text-caption">
        {{ weatherError }}
      </div>
    </q-card-section>

    <q-card-section v-if="activeAlerts.length" class="q-pt-none">
      <div class="weather-card__section-title">Active Alerts</div>
      <div class="weather-card__alerts">
        <div
          v-for="alert in activeAlerts"
          :key="alert.id"
          class="weather-card__alert"
        >
          <div class="weather-card__alert-title">
            {{ alert.event || 'Weather alert' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ alert.source || 'Alert source' }}
            <span v-if="alert.startsAt"> · Starts {{ formatTimestamp(alert.startsAt) }}</span>
            <span v-if="alert.endsAt"> · Ends {{ formatTimestamp(alert.endsAt) }}</span>
          </div>
          <div v-if="alert.headline" class="text-caption q-mt-xs">
            {{ alert.headline }}
          </div>
        </div>
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="weather-card__section-title">Next 7 Days</div>
      <div class="weather-card__forecast-list">
        <div
          v-for="day in dailyForecast.slice(0, 7)"
          :key="day.date"
          class="weather-card__forecast-day"
        >
          <div class="weather-card__forecast-date">
            {{ formatDay(day.date) }}
          </div>
          <div class="weather-card__forecast-temps">
            <span>{{ formatWhole(day.lowTempF) }}°</span>
            <span>{{ formatWhole(day.highTempF) }}°</span>
          </div>
          <div class="weather-card__forecast-summary">
            {{ day.summary || day.description || 'Forecast unavailable' }}
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  locationDisplayName: {
    type: String,
    required: true,
  },
  currentConditions: {
    type: Object,
    default: null,
  },
  dailyForecast: {
    type: Array,
    default: () => [],
  },
  activeAlerts: {
    type: Array,
    default: () => [],
  },
  usdaZone: {
    type: String,
    required: true,
  },
  averageLastFrostDate: {
    type: String,
    required: true,
  },
  averageFirstFrostDate: {
    type: String,
    required: true,
  },
  lastUpdatedAt: {
    type: String,
    required: true,
  },
  hasFreezeRisk: {
    type: Boolean,
    required: true,
  },
  hasHeatRisk: {
    type: Boolean,
    required: true,
  },
  hasWindRisk: {
    type: Boolean,
    required: true,
  },
  hasActiveWeatherAlerts: {
    type: Boolean,
    required: true,
  },
  weatherPending: {
    type: Boolean,
    required: true,
  },
  weatherError: {
    type: String,
    required: true,
  },
  canRefresh: {
    type: Boolean,
    required: true,
  },
})

defineEmits(['refresh-weather'])

function formatWhole(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : '--'
}

function formatDay(value) {
  if (!value) {
    return 'Day'
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatTimestamp(value) {
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
</script>

<style scoped>
.weather-card {
  border-radius: 20px;
}

.weather-card__location {
  font-size: 1rem;
  font-weight: 700;
  color: #31422d;
}

.weather-card__current {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
}

.weather-card__temp {
  font-size: clamp(2.2rem, 4vw, 3rem);
  font-weight: 700;
  line-height: 1;
  color: #253322;
}

.weather-card__current-meta {
  min-width: 0;
}

.weather-card__summary {
  font-weight: 600;
  color: #43573e;
}

.weather-card__risk-list {
  display: grid;
  gap: 8px;
}

.weather-card__risk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #51684f;
  font-size: 0.9rem;
}

.weather-card__risk-item--active {
  color: #253322;
  font-weight: 600;
}

.weather-card__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.weather-card__meta-item {
  padding: 12px;
  border-radius: 16px;
  background: #f7faf3;
  border: 1px solid #d8e2d1;
}

.weather-card__meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7e64;
}

.weather-card__meta-value {
  margin-top: 4px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #31422d;
}

.weather-card__section-title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7e64;
}

.weather-card__alerts {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.weather-card__alert {
  padding: 12px;
  border-radius: 16px;
  background: #fff8f1;
  border: 1px solid #f0d7bb;
}

.weather-card__alert-title {
  font-weight: 700;
  color: #6d3f09;
}

.weather-card__forecast-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.weather-card__forecast-day {
  display: grid;
  grid-template-columns: 132px 72px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f7faf3;
  border: 1px solid #d8e2d1;
}

.weather-card__forecast-date,
.weather-card__forecast-summary {
  color: #43573e;
}

.weather-card__forecast-temps {
  display: flex;
  gap: 8px;
  font-weight: 700;
  color: #253322;
}

@media (max-width: 640px) {
  .weather-card__forecast-day {
    grid-template-columns: 1fr;
  }
}
</style>
