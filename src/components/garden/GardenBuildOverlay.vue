<template>
  <div v-if="showLauncher" class="simulation-stage__capture-launcher">
    <q-btn
      rounded
      unelevated
      :color="accentColor"
      text-color="white"
      class="capture-launcher__btn"
      @click="$emit('toggle-capture-panel')"
    >
      <div class="capture-launcher__content">
        <GardenUiIcon
          :paths="launcherIconPaths"
          size="22px"
          color="#ffffff"
          class="capture-launcher__icon"
        />
        <span>{{ isCapturePanelOpen ? 'Close' : 'Add Areas' }}</span>
      </div>
      <q-tooltip>Add beds, pots, and structures</q-tooltip>
    </q-btn>
  </div>

  <div v-if="showCaptureSheet" class="simulation-stage__capture-sheet">
      <q-card flat bordered class="capture-sheet" :class="{ 'capture-sheet--mobile': isMobileCaptureMode }">
      <q-card-section class="capture-sheet__header">
        <div class="capture-sheet__title-block">
          <div class="capture-sheet__title">Add Areas</div>
          <div class="capture-sheet__caption">Choose an area type, then place it on the map.</div>
          <div v-if="placementFeedback" class="capture-sheet__status">
            <GardenUiIcon
              :paths="placementFeedbackIconPaths"
              size="14px"
              color="#4d6a42"
            />
            <span>{{ placementFeedback }}</span>
          </div>
        </div>
        <q-btn
          flat
          dense
          no-caps
          class="capture-sheet__done-btn"
          @click="$emit('close-capture-panel')"
        >
          <div class="capture-sheet__done-content">
            <GardenUiIcon
              :paths="doneButtonIconPaths"
              size="14px"
              color="#5c6e56"
            />
            <span>Done</span>
          </div>
        </q-btn>
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
            @click="$emit('toggle-capture-group', group.value)"
          >
            <div class="capture-sheet__button-row">
              <BuildMenuGlyph :kind="group.value" />
              <div class="capture-sheet__type-copy capture-sheet__type-copy--group">
                <span>{{ group.label }}</span>
              </div>
              <GardenUiIcon
                :paths="expandIconPaths"
                size="16px"
                color="currentColor"
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
                @click="$emit('start-placement', item)"
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
    v-if="showPlacementToolbar"
    class="simulation-stage__placement-toolbar"
    :style="pendingPlacementToolbarStyle"
    @mouseenter="$emit('set-toolbar-hovered', true)"
    @mouseleave="$emit('set-toolbar-hovered', false)"
    @pointerdown.stop
    @pointermove.stop
  >
    <q-card flat bordered class="placement-toolbar" :class="{ 'placement-toolbar--mobile': isMobileCaptureMode }">
      <q-card-section class="placement-toolbar__section">
        <div class="placement-toolbar__summary">
          <div class="placement-toolbar__title">{{ pendingPlacement?.name }}</div>
          <div class="placement-toolbar__meta">{{ pendingPlacementSizeLabel }}</div>
        </div>

        <div class="placement-toolbar__actions">
          <q-btn round unelevated color="white" text-color="grey-8" icon="rotate_90_degrees_cw" @click="$emit('rotate-pending-placement')">
            <q-tooltip>Rotate</q-tooltip>
          </q-btn>
          <q-btn round unelevated color="white" text-color="grey-8" icon="zoom_out_map" @click="$emit('cycle-pending-placement-size')">
            <q-tooltip>Edit size</q-tooltip>
          </q-btn>
          <q-btn round unelevated :color="accentColor" text-color="white" icon="done" @click="$emit('place-pending-placement')">
            <q-tooltip>Place</q-tooltip>
          </q-btn>
          <q-btn round unelevated color="white" text-color="grey-8" icon="close" @click="$emit('cancel-pending-placement')">
            <q-tooltip>Cancel</q-tooltip>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import BuildMenuGlyph from 'src/components/garden/BuildMenuGlyph.vue'
import GardenUiIcon from 'src/components/garden/GardenUiIcon.vue'
import { bedSupportsHeight } from 'src/utils/garden'

const launcherIconPaths = [
  { d: 'M12 5V19' },
  { d: 'M5 12H19' },
]
const placementFeedbackIconPaths = [
  { d: 'M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21' },
  { d: 'M8 12.5L10.75 15.25L16 10' },
]
const expandIconPaths = [
  { d: 'M6 9L12 15L18 9' },
]
const doneButtonIconPaths = [
  { d: 'M8 8L16 16' },
  { d: 'M16 8L8 16' },
]

const props = defineProps({
  showLauncher: {
    type: Boolean,
    required: true,
  },
  isCapturePanelOpen: {
    type: Boolean,
    required: true,
  },
  showCaptureSheet: {
    type: Boolean,
    required: true,
  },
  showPlacementToolbar: {
    type: Boolean,
    required: true,
  },
  accentColor: {
    type: String,
    required: true,
  },
  isMobileCaptureMode: {
    type: Boolean,
    required: true,
  },
  captureGroups: {
    type: Array,
    required: true,
  },
  captureItems: {
    type: Array,
    required: true,
  },
  selectedCaptureGroup: {
    type: String,
    default: null,
  },
  pendingPlacement: {
    type: Object,
    default: null,
  },
  pendingPlacementToolbarStyle: {
    type: Object,
    required: true,
  },
  pendingPlacementSizeLabel: {
    type: String,
    required: true,
  },
  placementFeedback: {
    type: String,
    default: '',
  },
})

defineEmits([
  'toggle-capture-panel',
  'close-capture-panel',
  'toggle-capture-group',
  'start-placement',
  'set-toolbar-hovered',
  'rotate-pending-placement',
  'cycle-pending-placement-size',
  'place-pending-placement',
  'cancel-pending-placement',
])

function getCaptureItemsByGroup(groupValue) {
  return props.captureItems.filter((item) => item.group === groupValue)
}

function getCaptureItemSummary(item) {
  const sizeLabel = `${item.widthFeet} x ${item.heightFeet} ft`
  return bedSupportsHeight(item.storeType) ? `${sizeLabel} · ${item.bedHeightInches} in` : sizeLabel
}
</script>

<style scoped>
.simulation-stage__capture-launcher {
  position: absolute;
  top: 112px;
  right: 72px;
  left: auto;
  z-index: 4;
}

.simulation-stage__capture-launcher :deep(.q-btn) {
  min-height: 46px;
  padding-inline: 16px;
  box-shadow: 0 12px 24px rgba(37, 51, 34, 0.14);
}

.capture-launcher__content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.capture-launcher__icon {
  opacity: 0.92;
}

.simulation-stage__capture-sheet {
  position: absolute;
  right: 72px;
  left: auto;
  top: 168px;
  z-index: 4;
  max-width: min(228px, calc(100vw - 132px));
}

.simulation-stage__placement-toolbar {
  position: absolute;
  z-index: 4;
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

.capture-sheet__done-btn {
  color: #5c6e56;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.capture-sheet__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(103, 138, 85, 0.12);
  color: #4d6a42;
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.02em;
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

@media (max-width: 680px) {
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
}
</style>
