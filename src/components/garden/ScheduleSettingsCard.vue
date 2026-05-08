<template>
  <q-card flat bordered class="schedule-card">
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">Season Timing</div>
        <div class="text-caption text-grey-7">
          Set the home climate for this garden. ZIP, zone, and frost windows help the season fall into place.
        </div>
      </div>
    </q-card-section>

    <q-card-section class="row q-col-gutter-sm">
      <div class="col-12 col-md-3">
        <q-input
          :model-value="zipCode"
          outlined
          dense
          label="Home ZIP"
          maxlength="10"
          @update:model-value="$emit('update:zipCode', $event)"
        />
      </div>

      <div class="col-12 col-md-auto">
        <q-btn
          color="positive"
          unelevated
          label="Find Climate"
          :loading="zipLookupPending"
          @click="$emit('lookup-zip')"
        />
      </div>

      <div v-if="locationName" class="col-12 col-md">
        <div class="schedule-card__location">
          {{ locationName }}<span v-if="stateCode">, {{ stateCode }}</span>
          <span v-if="latitude !== null && longitude !== null" class="schedule-card__coords">
            · {{ latitude.toFixed(3) }}, {{ longitude.toFixed(3) }}
          </span>
        </div>
      </div>

      <div v-if="zipLookupError" class="col-12 text-negative text-caption">
        {{ zipLookupError }}
      </div>
    </q-card-section>

    <q-card-section class="row q-col-gutter-sm q-pt-none">
      <div class="col-12 col-md-4">
        <q-input
          :model-value="usdaZone"
          outlined
          dense
          label="USDA Zone"
          @update:model-value="$emit('update:usdaZone', $event)"
        />
      </div>

      <div class="col-12 col-md-4">
        <q-input
          :model-value="averageLastFrostDate"
          type="date"
          outlined
          dense
          label="Average Last Frost"
          @update:model-value="$emit('update:averageLastFrostDate', $event)"
        />
      </div>

      <div class="col-12 col-md-4">
        <q-input
          :model-value="averageFirstFrostDate"
          type="date"
          outlined
          dense
          label="Average First Frost"
          @update:model-value="$emit('update:averageFirstFrostDate', $event)"
        />
      </div>

      <div v-if="growingZoneMeta" class="col-12 text-caption text-grey-7">
        {{ growingZoneMeta }}
      </div>

      <div v-if="growingZoneError" class="col-12 text-negative text-caption">
        {{ growingZoneError }}
      </div>
    </q-card-section>

    <q-card-section class="row q-col-gutter-sm q-pt-none">
      <div class="col-12 col-md-auto">
        <q-btn
          color="secondary"
          outline
          label="Suggest Frost Window"
          :loading="frostSuggestionPending"
          @click="$emit('suggest-frost-dates')"
        />
      </div>

      <div
        v-if="suggestedFrostDates"
        class="col-12"
      >
        <div class="schedule-card__suggestion">
          <div class="schedule-card__suggestion-title">
            Suggested Frost Window
          </div>
          <div class="schedule-card__suggestion-dates">
            <span v-if="suggestedFrostDates.lastFrostDate">Last: {{ suggestedFrostDates.lastFrostDate }}</span>
            <span v-if="suggestedFrostDates.firstFrostDate">First: {{ suggestedFrostDates.firstFrostDate }}</span>
          </div>
          <div class="schedule-card__suggestion-meta">
            Source: {{ suggestedFrostDates.source }} · Confidence: {{ suggestedFrostDates.confidence }}
          </div>
          <div v-if="suggestedFrostDates.notes" class="text-caption text-grey-7">
            {{ suggestedFrostDates.notes }}
          </div>
          <q-btn
            class="q-mt-sm"
            color="positive"
            unelevated
            label="Use This Window"
            :disable="!suggestedFrostDates.lastFrostDate && !suggestedFrostDates.firstFrostDate"
            @click="$emit('apply-suggested-frost-dates')"
          />
        </div>
      </div>

      <div v-if="frostSuggestionError" class="col-12 text-negative text-caption">
        {{ frostSuggestionError }}
      </div>
    </q-card-section>

    <q-card-section class="row q-col-gutter-sm q-pt-none">
      <div class="col-12 col-md-4">
        <q-input
          :model-value="lastFrostDate"
          type="date"
          outlined
          dense
          label="Season Last Frost"
          @update:model-value="$emit('update:lastFrostDate', $event)"
        />
      </div>

      <div class="col-12 col-md-4">
        <q-input
          :model-value="firstFrostDate"
          type="date"
          outlined
          dense
          label="Season First Frost"
          @update:model-value="$emit('update:firstFrostDate', $event)"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  zipCode: {
    type: String,
    required: true,
  },
  locationName: {
    type: String,
    required: true,
  },
  stateCode: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    default: null,
  },
  longitude: {
    type: Number,
    default: null,
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
  growingZoneMeta: {
    type: String,
    required: true,
  },
  growingZoneError: {
    type: String,
    required: true,
  },
  zipLookupPending: {
    type: Boolean,
    required: true,
  },
  zipLookupError: {
    type: String,
    required: true,
  },
  suggestedFrostDates: {
    type: Object,
    default: null,
  },
  frostSuggestionPending: {
    type: Boolean,
    required: true,
  },
  frostSuggestionError: {
    type: String,
    required: true,
  },
  lastFrostDate: {
    type: String,
    required: true,
  },
  firstFrostDate: {
    type: String,
    required: true,
  },
})

defineEmits([
  'update:zipCode',
  'update:usdaZone',
  'update:averageLastFrostDate',
  'update:averageFirstFrostDate',
  'update:lastFrostDate',
  'update:firstFrostDate',
  'lookup-zip',
  'suggest-frost-dates',
  'apply-suggested-frost-dates',
])
</script>

<style scoped>
.schedule-card {
  border-radius: 20px;
}

.schedule-card__location {
  padding-top: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  color: #43573e;
}

.schedule-card__coords {
  font-weight: 500;
  color: #6b7e64;
}

.schedule-card__suggestion {
  padding: 14px 16px;
  border: 1px solid #d8e2d1;
  border-radius: 16px;
  background: #f8fbf5;
}

.schedule-card__suggestion-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #31422d;
}

.schedule-card__suggestion-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #43573e;
}

.schedule-card__suggestion-meta {
  margin-top: 6px;
  font-size: 0.78rem;
  color: #6b7e64;
}
</style>
