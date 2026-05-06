<template>
  <q-card flat bordered class="tray-card">
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">Propagation Trays</div>
        <div class="text-caption text-grey-7">
          Indoor-start crop plans can be assigned to trays before they move into the garden.
        </div>
      </div>

      <div class="col-auto row q-gutter-sm">
        <q-btn flat label="Add 50-Cell Tray" @click="$emit('create-tray', 50)" />
        <q-btn color="positive" unelevated label="Add 72-Cell Tray" @click="$emit('create-tray', 72)" />
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="tray-board">
      <section class="tray-board__column">
        <div class="tray-board__label">Indoor Start Demand</div>

        <div v-if="demands.length" class="tray-board__list">
          <div v-for="demand in demands" :key="demand.cropPlanId" class="tray-demand">
            <div class="tray-demand__title">{{ demand.plantName }}</div>
            <div class="tray-demand__meta">{{ demand.areaName }} · {{ demand.remainingCells }} cells remaining</div>

            <div class="row q-col-gutter-sm items-end">
              <div class="col">
                <q-select
                  v-model="selectedTrayByDemand[demand.cropPlanId]"
                  :options="trayOptions"
                  emit-value
                  map-options
                  outlined
                  dense
                  label="Assign to tray"
                />
              </div>

              <div class="col-4">
                <q-input
                  v-model.number="cellCountByDemand[demand.cropPlanId]"
                  type="number"
                  min="1"
                  :max="demand.remainingCells"
                  outlined
                  dense
                  label="Cells"
                />
              </div>
            </div>

            <div class="row q-gutter-sm">
              <q-btn
                color="positive"
                unelevated
                label="Assign"
                :disable="!selectedTrayByDemand[demand.cropPlanId]"
                @click="assignDemand(demand)"
              />
              <q-btn flat label="Assign Remaining to New 72" @click="$emit('quick-assign-new-tray', demand)" />
            </div>
          </div>
        </div>

        <div v-else class="text-caption text-grey-7">
          No indoor-start crop plans currently need tray space.
        </div>
      </section>

      <section class="tray-board__column">
        <div class="tray-board__label">Current Trays</div>

        <div v-if="trays.length" class="tray-board__list">
          <div v-for="tray in trays" :key="tray.id" class="tray-summary">
            <div>
              <div class="tray-summary__title">{{ tray.name }}</div>
              <div class="tray-summary__meta">{{ tray.usedCells }}/{{ tray.cellCount }} cells used · {{ tray.openCells }} open</div>
            </div>

            <q-select
              :model-value="tray.status"
              :options="trayStatusOptions"
              emit-value
              map-options
              outlined
              dense
              label="Tray Status"
              @update:model-value="$emit('update-tray-status', { trayId: tray.id, status: $event })"
            />

            <div v-if="tray.assignments.length" class="tray-summary__assignments">
              <div v-for="assignment in tray.assignments" :key="assignment.id" class="tray-summary__assignment">
                <div class="tray-summary__assignment-copy">
                  <div class="tray-summary__assignment-title">{{ assignment.plantName }}</div>
                  <div class="tray-summary__assignment-meta">{{ assignment.areaName }} · {{ assignment.cellCount }} cells</div>
                </div>

                <div class="tray-summary__assignment-actions">
                  <q-select
                    :model-value="assignment.status"
                    :options="assignmentStatusOptions"
                    emit-value
                    map-options
                    outlined
                    dense
                    label="Status"
                    class="tray-summary__assignment-status"
                    @update:model-value="$emit('update-assignment-status', { assignmentId: assignment.id, status: $event })"
                  />

                  <q-btn flat dense icon="delete" @click="$emit('remove-assignment', assignment.id)">
                    <q-tooltip>Remove assignment</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>

            <div v-else class="text-caption text-grey-7">
              No assignments yet.
            </div>
          </div>
        </div>

        <div v-else class="text-caption text-grey-7">
          Create a tray to start assigning indoor-start crop plans.
        </div>
      </section>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { reactive } from 'vue'

defineProps({
  demands: {
    type: Array,
    required: true,
  },
  trays: {
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

const emit = defineEmits([
  'create-tray',
  'assign-demand',
  'quick-assign-new-tray',
  'remove-assignment',
  'update-tray-status',
  'update-assignment-status',
])

const selectedTrayByDemand = reactive({})
const cellCountByDemand = reactive({})

function assignDemand(demand) {
  const trayId = selectedTrayByDemand[demand.cropPlanId]
  const cellCount = Math.max(1, Math.min(
    Number(cellCountByDemand[demand.cropPlanId]) || demand.remainingCells,
    demand.remainingCells,
  ))

  emit('assign-demand', {
    cropPlanId: demand.cropPlanId,
    trayId,
    cellCount,
  })

  cellCountByDemand[demand.cropPlanId] = Math.max(demand.remainingCells - cellCount, 1)
}
</script>

<style scoped>
.tray-card {
  border-radius: 20px;
}

.tray-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.tray-board__column {
  display: grid;
  gap: 12px;
}

.tray-board__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #607259;
}

.tray-board__list {
  display: grid;
  gap: 12px;
}

.tray-demand,
.tray-summary {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 252, 244, 0.72);
  border: 1px solid rgba(78, 101, 72, 0.12);
}

.tray-demand__title,
.tray-summary__title,
.tray-summary__assignment-title {
  font-weight: 600;
  color: #2f412b;
}

.tray-demand__meta,
.tray-summary__meta,
.tray-summary__assignment-meta {
  font-size: 12px;
  color: #667861;
}

.tray-summary__assignments {
  display: grid;
  gap: 8px;
}

.tray-summary__assignment {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(78, 101, 72, 0.1);
}

.tray-summary__assignment-copy {
  min-width: 0;
}

.tray-summary__assignment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tray-summary__assignment-status {
  width: 180px;
}

@media (max-width: 900px) {
  .tray-board {
    grid-template-columns: 1fr;
  }
}
</style>
