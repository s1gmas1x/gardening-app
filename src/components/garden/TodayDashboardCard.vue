<template>
  <q-card flat bordered class="today-card">
    <q-card-section class="today-card__header">
      <div class="today-card__heading">
        <div class="today-card__eyebrow">Action Center</div>
        <div class="today-card__title">Today</div>
        <div class="today-card__date">{{ todayLabel }}</div>
      </div>

      <q-btn
        flat
        round
        dense
        color="positive"
        :icon="isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
        @click="isExpanded = !isExpanded"
      />
    </q-card-section>

    <q-card-section class="today-card__snapshot">
      <div class="today-card__snapshot-item">
        <span class="today-card__snapshot-value">{{ dueToday.length }}</span>
        <span class="today-card__snapshot-label">due</span>
      </div>
      <div class="today-card__snapshot-item">
        <span class="today-card__snapshot-value">{{ weatherRisks.length }}</span>
        <span class="today-card__snapshot-label">weather</span>
      </div>
      <div class="today-card__snapshot-item">
        <span class="today-card__snapshot-value">{{ propagationStatus.length }}</span>
        <span class="today-card__snapshot-label">trays</span>
      </div>
    </q-card-section>

    <q-card-section class="today-card__peek">
      <div v-if="topPriorityItem" class="today-card__peek-title">
        {{ topPriorityItem.title }}
      </div>
      <div v-if="topPriorityItem?.meta" class="today-card__peek-meta">
        {{ topPriorityItem.meta }}
      </div>
      <div v-else class="today-card__peek-meta">
        No urgent actions right now.
      </div>
    </q-card-section>

    <q-slide-transition>
      <div v-show="isExpanded">
        <q-separator />

        <q-card-section class="today-card__sections">
          <section class="today-card__section">
            <div class="today-card__section-header">
              <div class="today-card__section-title">Due Today</div>
              <div class="today-card__section-meta">{{ dueTodayMeta }}</div>
            </div>

            <div v-if="dueToday.length" class="today-card__list">
              <article
                v-for="item in dueToday.slice(0, 3)"
                :key="item.id"
                class="today-card__item"
              >
                <div class="today-card__item-copy">
                  <div class="today-card__item-row">
                    <div class="today-card__item-title">{{ item.title }}</div>
                    <q-badge :color="item.chipColor" text-color="white" rounded>
                      {{ item.chipLabel }}
                    </q-badge>
                  </div>
                  <div v-if="item.meta" class="today-card__item-meta">{{ item.meta }}</div>
                </div>
              </article>
            </div>

            <div v-else class="today-card__empty">
              Nothing due today.
            </div>
          </section>

          <section class="today-card__section">
            <div class="today-card__section-header">
              <div class="today-card__section-title">This Week</div>
              <div class="today-card__section-meta">{{ upcomingMeta }}</div>
            </div>

            <div v-if="upcomingThisWeek.length" class="today-card__list">
              <article
                v-for="item in upcomingThisWeek.slice(0, 3)"
                :key="item.id"
                class="today-card__item"
              >
                <div class="today-card__item-copy">
                  <div class="today-card__item-row">
                    <div class="today-card__item-title">{{ item.title }}</div>
                    <q-badge :color="item.chipColor" text-color="white" rounded>
                      {{ item.chipLabel }}
                    </q-badge>
                  </div>
                  <div v-if="item.meta" class="today-card__item-meta">{{ item.meta }}</div>
                </div>
              </article>
            </div>

            <div v-else class="today-card__empty">
              No immediate upcoming items.
            </div>
          </section>

          <section class="today-card__section">
            <div class="today-card__section-header">
              <div class="today-card__section-title">Weather</div>
              <div class="today-card__section-meta">{{ weatherMeta }}</div>
            </div>

            <div v-if="weatherRisks.length" class="today-card__list">
              <article
                v-for="item in weatherRisks.slice(0, 2)"
                :key="item.id"
                class="today-card__item today-card__item--warning"
              >
                <div class="today-card__item-copy">
                  <div class="today-card__item-row">
                    <div class="today-card__item-title">{{ item.title }}</div>
                    <q-badge :color="item.chipColor" text-color="white" rounded>
                      {{ item.chipLabel }}
                    </q-badge>
                  </div>
                  <div v-if="item.meta" class="today-card__item-meta">{{ item.meta }}</div>
                </div>
              </article>
            </div>

            <div v-else class="today-card__empty">
              No active weather flags.
            </div>
          </section>

          <section class="today-card__section">
            <div class="today-card__section-header">
              <div class="today-card__section-title">Propagation</div>
              <div class="today-card__section-meta">{{ propagationMeta }}</div>
            </div>

            <div v-if="propagationStatus.length" class="today-card__list">
              <article
                v-for="item in propagationStatus.slice(0, 2)"
                :key="item.id"
                class="today-card__item"
                :class="{ 'today-card__item--warning': item.chipLabel === 'warning' }"
              >
                <div class="today-card__item-copy">
                  <div class="today-card__item-row">
                    <div class="today-card__item-title">{{ item.title }}</div>
                    <q-badge :color="item.chipColor" text-color="white" rounded>
                      {{ item.chipLabel }}
                    </q-badge>
                  </div>
                  <div v-if="item.meta" class="today-card__item-meta">{{ item.meta }}</div>
                </div>
              </article>
            </div>

            <div v-else class="today-card__empty">
              No propagation issues.
            </div>
          </section>
        </q-card-section>
      </div>
    </q-slide-transition>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  todayLabel: {
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

const topPriorityItem = computed(() => (
  [
    ...props.weatherRisks,
    ...props.dueToday,
    ...props.propagationStatus,
    ...props.upcomingThisWeek,
  ][0] ?? null
))
</script>

<style scoped>
.today-card {
  width: min(100%, 340px);
  border-radius: 20px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(179, 214, 148, 0.35), transparent 32%),
    linear-gradient(135deg, #fffdf6 0%, #f5faef 55%, #edf4e7 100%);
  box-shadow: 0 16px 36px rgba(53, 72, 47, 0.12);
}

.today-card__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
}

.today-card__eyebrow {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5f7a50;
}

.today-card__title {
  font-size: 1.5rem;
  line-height: 0.95;
  letter-spacing: -0.05em;
  color: #26351f;
}

.today-card__date {
  margin-top: 2px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #5a7150;
}

.today-card__snapshot {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 0;
}

.today-card__snapshot-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid rgba(129, 160, 107, 0.24);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
}

.today-card__snapshot-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: #253322;
}

.today-card__snapshot-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #677b5d;
}

.today-card__peek {
  padding-top: 2px;
}

.today-card__peek-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: #2c3925;
}

.today-card__peek-meta {
  margin-top: 2px;
  font-size: 0.75rem;
  color: #697d60;
}

.today-card__sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.today-card__section {
  display: grid;
  gap: 10px;
  align-content: start;
}

.today-card__section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.today-card__section-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #2a3924;
}

.today-card__section-meta {
  font-size: 0.76rem;
  color: #6b8061;
  text-align: right;
}

.today-card__list {
  display: grid;
  gap: 10px;
}

.today-card__item {
  padding: 10px 12px;
  border: 1px solid #dbe7d4;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
}

.today-card__item--warning {
  border-color: #efd7a7;
  background: linear-gradient(180deg, #fffdf5 0%, #fff8e4 100%);
}

.today-card__item-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.today-card__item-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: #283422;
}

.today-card__item-meta {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #687d5f;
}

.today-card__item-note {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #596d51;
}

.today-card__empty {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
  font-size: 0.8rem;
  color: #6b8061;
}

@media (max-width: 640px) {
  .today-card {
    width: 100%;
  }
}
</style>
