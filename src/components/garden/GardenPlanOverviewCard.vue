<template>
  <q-card flat bordered class="plan-overview-card">
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">Growing Map</div>
        <div class="text-caption text-grey-7">
          See what each growing zone is meant to hold and what still needs a home.
        </div>
      </div>

      <div class="col-auto text-caption text-grey-7">
        {{ areaCount }} zone<span v-if="areaCount !== 1">s</span> · {{ cropPlanCount }} crop plan<span v-if="cropPlanCount !== 1">s</span>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section v-if="!areas.length" class="text-caption text-grey-7">
      Place a bed or pot to start shaping the garden map.
    </q-card-section>

    <div v-else class="plan-overview-card__areas">
      <section
        v-for="area in areas"
        :key="area.id"
        class="plan-overview-area"
      >
        <div class="plan-overview-area__header">
          <div>
            <div class="plan-overview-area__name">{{ area.name }}</div>
            <div class="plan-overview-area__meta">
              {{ area.typeLabel }} · {{ area.widthFeet }} x {{ area.heightFeet }} ft
              <span v-if="area.bedHeightInches"> · {{ area.bedHeightInches }} in tall</span>
            </div>
          </div>

          <div class="plan-overview-area__actions">
            <div class="plan-overview-area__stats">
              <span>{{ area.placedCount }}/{{ area.plannedCount }} in garden</span>
              <span v-if="area.remainingCount">· {{ area.remainingCount }} remaining</span>
            </div>
            <q-btn flat dense icon="my_location" label="Focus zone" @click="$emit('focus-area', area.id)" />
          </div>
        </div>

        <div v-if="area.cropPlans.length" class="plan-overview-area__plans">
          <div class="plan-overview-area__sketch">
            <div class="plan-overview-area__sketch-header">
              <span class="plan-overview-area__sketch-title">Zone sketch</span>
              <span class="plan-overview-area__sketch-meta">
                {{ area.reservedAreaPercent }}% of the zone reserved by current crop plans
              </span>
            </div>

            <div class="plan-overview-area__sketch-bed">
              <div
                v-for="segment in area.previewSegments"
                :key="segment.id"
                class="plan-overview-area__sketch-segment"
                :style="{ width: `${segment.widthPercent}%`, backgroundColor: segment.color }"
              >
                <span class="plan-overview-area__sketch-label">{{ segment.shortLabel }}</span>
                <q-tooltip>
                  {{ segment.plantName }}
                </q-tooltip>
              </div>
            </div>

            <div class="plan-overview-area__sketch-note">
              This is a planning sketch based on crop spacing. Final plant spots are placed when you open the zone.
            </div>
          </div>

          <div
            v-for="cropPlan in area.cropPlans"
            :key="cropPlan.id"
            class="plan-overview-plan"
          >
            <div class="plan-overview-plan__copy">
              <div class="plan-overview-plan__title">
                <span class="plan-overview-plan__swatch" :style="{ backgroundColor: cropPlan.color }"></span>
                {{ cropPlan.plantName }}
              </div>
              <div class="plan-overview-plan__meta">
                {{ cropPlan.methodLabel }} · {{ cropPlan.placedCount }}/{{ cropPlan.targetQuantity }} in garden
              </div>
              <div class="plan-overview-plan__fit">
                {{ cropPlan.fitStatusLabel }}
              </div>
            </div>

            <div class="plan-overview-plan__actions">
              <div class="plan-overview-plan__remaining">
                {{ cropPlan.remainingCount }} remaining
              </div>
              <q-btn
                v-if="cropPlan.remainingCount > 0"
                flat
                dense
                color="positive"
                icon="eco"
                label="Place Crop"
                @click="$emit('plant-crop', { areaId: area.id, plantId: cropPlan.plantId })"
              />
            </div>
          </div>
        </div>

        <div v-else class="plan-overview-area__empty text-caption text-grey-7">
          Nothing has been planted into this zone yet.
        </div>

        <div class="plan-overview-area__footer">
          <q-btn
            color="positive"
            unelevated
            icon="eco"
            label="Plan This Zone"
            @click="$emit('plant-area', area.id)"
          />
        </div>
      </section>
    </div>
  </q-card>
</template>

<script setup>
defineProps({
  areas: {
    type: Array,
    required: true,
  },
  areaCount: {
    type: Number,
    required: true,
  },
  cropPlanCount: {
    type: Number,
    required: true,
  },
})

defineEmits(['focus-area', 'plant-area', 'plant-crop'])
</script>

<style scoped>
.plan-overview-card {
  border-radius: 20px;
}

.plan-overview-card__areas {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.plan-overview-area {
  padding: 14px 14px 12px;
  border: 1px solid #dbe5d5;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdf8 0%, #f5f9f1 100%);
}

.plan-overview-area__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.plan-overview-area__name {
  font-size: 1rem;
  font-weight: 700;
  color: #2d3b28;
}

.plan-overview-area__meta {
  margin-top: 2px;
  font-size: 0.8rem;
  color: #6b7e64;
}

.plan-overview-area__actions {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.plan-overview-area__stats {
  font-size: 0.8rem;
  color: #5f7259;
}

.plan-overview-area__plans {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.plan-overview-area__sketch {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid #e1e9da;
}

.plan-overview-area__sketch-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.plan-overview-area__sketch-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4f6348;
}

.plan-overview-area__sketch-meta,
.plan-overview-plan__fit {
  font-size: 0.76rem;
  color: #6b7e64;
}

.plan-overview-area__sketch-bed {
  display: flex;
  min-height: 44px;
  overflow: hidden;
  border-radius: 12px;
  background: #eef4e8;
  border: 1px solid #d9e3d3;
}

.plan-overview-area__sketch-segment {
  min-width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.plan-overview-area__sketch-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: rgba(31, 38, 27, 0.88);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28);
}

.plan-overview-area__sketch-note {
  font-size: 0.76rem;
  color: #62755c;
}

.plan-overview-plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e1e9da;
}

.plan-overview-plan__copy {
  min-width: 0;
}

.plan-overview-plan__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  color: #273421;
}

.plan-overview-plan__swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.plan-overview-plan__meta,
.plan-overview-plan__remaining {
  font-size: 0.78rem;
  color: #6b7e64;
}

.plan-overview-plan__actions {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.plan-overview-area__empty {
  margin-top: 10px;
}

.plan-overview-area__footer {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
