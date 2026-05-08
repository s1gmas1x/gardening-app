<template>
  <q-card flat bordered class="onboarding-card">
    <template v-if="collapsed">
      <q-card-section class="row items-center justify-between q-col-gutter-md">
        <div class="col">
          <div class="text-overline text-positive">Season Underway</div>
          <div class="text-subtitle1 text-weight-medium">The garden has enough structure to run on its daily rhythm.</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            {{ collapsedSummary }}
          </div>
        </div>

        <div class="col-auto row items-center q-gutter-sm">
          <q-chip
            dense
            outline
            color="positive"
            icon="task_alt"
            :label="`${completedStepCount}/${steps.length} ready`"
          />
          <q-btn flat dense color="positive" label="Reopen Guide" @click="$emit('expand')" />
        </div>
      </q-card-section>
    </template>

    <template v-else>
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-overline text-positive">Season Start Guide</div>
        <div class="text-h6 text-weight-bold">Build the garden in a few calm passes.</div>
        <div class="text-caption text-grey-7 q-mt-xs">
          Start with the map, give each zone a purpose, then let trays, timing, and daily rhythm follow.
        </div>
      </div>

      <div class="col-auto">
        <q-chip
          dense
          outline
          color="positive"
          icon="task_alt"
          :label="`${completedStepCount}/${steps.length} ready`"
        />
        <q-btn
          v-if="canCollapse"
          flat
          round
          dense
          icon="expand_less"
          class="q-ml-sm"
          aria-label="Collapse season start guide"
          @click="$emit('collapse')"
        />
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="onboarding-card__metrics">
        <q-chip dense outline color="primary" icon="crop_square">
          {{ metrics.footprintLabel }}
        </q-chip>
        <q-chip dense outline color="secondary" icon="grid_view">
          {{ metrics.growingAreaLabel }}
        </q-chip>
        <q-chip dense outline color="accent" icon="water_drop">
          {{ metrics.soilVolumeLabel }}
        </q-chip>
      </div>
    </q-card-section>

    <q-card-section v-if="currentStep" class="q-pt-none">
      <div class="onboarding-card__current">
        <q-icon name="assistant" color="warning" size="18px" />
        <span>Next up: {{ currentStep.title }}</span>
      </div>
    </q-card-section>

    <q-separator />

    <q-list separator>
      <q-item
        v-for="step in steps"
        :key="step.key"
        class="onboarding-card__step"
        :class="{
          'onboarding-card__step--current': step.key === activeStepKey,
          'onboarding-card__step--complete': step.status === 'complete',
        }"
      >
        <q-item-section avatar top>
          <q-icon
            :name="getStepIcon(step.status)"
            :color="getStepColor(step.status)"
            size="22px"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-medium">{{ step.title }}</q-item-label>
          <q-item-label caption>{{ step.body }}</q-item-label>
          <q-item-label v-if="step.meta" caption class="text-grey-6 q-mt-xs">
            {{ step.meta }}
          </q-item-label>
        </q-item-section>

        <q-item-section side top class="items-end q-gutter-xs">
          <q-chip
            dense
            square
            :color="getStepColor(step.status)"
            :text-color="step.status === 'current' ? 'dark' : 'white'"
            :label="getStepLabel(step.status)"
          />
          <q-btn
            v-if="step.actionLabel"
            flat
            dense
            color="positive"
            :label="step.actionLabel"
            @click="$emit('run-action', step.actionKey)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    </template>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  steps: {
    type: Array,
    required: true,
  },
  completedStepCount: {
    type: Number,
    required: true,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  collapsedSummary: {
    type: String,
    default: '',
  },
  canCollapse: {
    type: Boolean,
    default: false,
  },
  activeStepKey: {
    type: String,
    default: '',
  },
  metrics: {
    type: Object,
    required: true,
  },
})

defineEmits(['run-action', 'collapse', 'expand'])

const currentStep = computed(() => (
  props.steps.find((step) => step.key === props.activeStepKey) ?? null
))

function getStepIcon(status) {
  if (status === 'complete') {
    return 'task_alt'
  }

  if (status === 'current') {
    return 'play_circle'
  }

  return 'radio_button_unchecked'
}

function getStepColor(status) {
  if (status === 'complete') {
    return 'positive'
  }

  if (status === 'current') {
    return 'warning'
  }

  return 'grey-6'
}

function getStepLabel(status) {
  if (status === 'complete') {
    return 'Ready'
  }

  if (status === 'current') {
    return 'Next'
  }

  return 'Soon'
}
</script>

<style scoped>
.onboarding-card {
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(180, 214, 147, 0.22), transparent 36%),
    linear-gradient(180deg, rgba(255, 252, 244, 0.96) 0%, rgba(247, 250, 240, 0.96) 100%);
}

.onboarding-card__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.onboarding-card__step {
  align-items: flex-start;
}

.onboarding-card__current {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 209, 102, 0.14);
  color: #6c5818;
  font-size: 0.82rem;
  font-weight: 600;
}

.onboarding-card__step--current {
  background: rgba(255, 209, 102, 0.08);
}

.onboarding-card__step--complete {
  background: rgba(123, 191, 88, 0.06);
}
</style>
