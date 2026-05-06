<template>
  <q-card flat bordered class="plan-overview-card">
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">Planting Overview</div>
        <div class="text-caption text-grey-7">
          What is planned in each area and how much is still left to place.
        </div>
      </div>

      <div class="col-auto text-caption text-grey-7">
        {{ areaCount }} area<span v-if="areaCount !== 1">s</span> · {{ cropPlanCount }} crop plan<span v-if="cropPlanCount !== 1">s</span>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section v-if="!areas.length" class="text-caption text-grey-7">
      Add a bed or pot to start building out the planting plan.
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
              <span>{{ area.placedCount }}/{{ area.plannedCount }} placed</span>
              <span v-if="area.remainingCount">· {{ area.remainingCount }} remaining</span>
            </div>
            <q-btn flat dense icon="my_location" label="Focus area" @click="$emit('focus-area', area.id)" />
          </div>
        </div>

        <div v-if="area.cropPlans.length" class="plan-overview-area__plans">
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
                {{ cropPlan.methodLabel }} · {{ cropPlan.placedCount }}/{{ cropPlan.targetQuantity }} placed
              </div>
            </div>

            <div class="plan-overview-plan__remaining">
              {{ cropPlan.remainingCount }} remaining
            </div>
          </div>
        </div>

        <div v-else class="plan-overview-area__empty text-caption text-grey-7">
          No crop plans assigned to this area yet.
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

defineEmits(['focus-area'])
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

.plan-overview-area__empty {
  margin-top: 10px;
}
</style>
