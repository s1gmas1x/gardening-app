<template>
  <q-card flat bordered class="setup-card">
    <q-card-section>
      <div class="text-overline text-positive">Start Your Garden</div>
      <div class="text-h4 text-weight-bold">Map the footprint of your growing world</div>
      <div class="text-body1 text-grey-7 q-mt-sm">
        Begin with the full space in feet. Beds and pots can be placed, moved, and tuned once the canvas opens.
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <q-form class="column q-gutter-md" @submit.prevent="submitForm">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="form.widthFeet"
              type="number"
              min="1"
              step="1"
              outlined
              label="Garden width"
              suffix="ft"
            />
          </div>

          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="form.lengthFeet"
              type="number"
              min="1"
              step="1"
              outlined
              label="Garden length"
              suffix="ft"
            />
          </div>
        </div>

        <div class="row items-center justify-between q-gutter-sm">
          <div class="text-caption text-grey-7">
            A friendly first sketch: `20 x 30 ft`
          </div>

          <q-btn color="positive" label="Start Garden" type="submit" />
        </div>

        <div class="setup-card__next">
          <div class="setup-card__next-title">What happens next</div>
          <div class="setup-card__next-grid">
            <div class="setup-card__next-item">
              <q-icon name="grid_view" color="positive" size="18px" />
              <span>Place beds and pots on the garden map.</span>
            </div>
            <div class="setup-card__next-item">
              <q-icon name="eco" color="positive" size="18px" />
              <span>Choose what grows in each zone.</span>
            </div>
            <div class="setup-card__next-item">
              <q-icon name="event" color="positive" size="18px" />
              <span>Let trays, timing, and daily tasks fall into place.</span>
            </div>
          </div>
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['submit'])

const form = reactive({
  widthFeet: 20,
  lengthFeet: 30,
})

function submitForm() {
  emit('submit', {
    widthFeet: form.widthFeet,
    lengthFeet: form.lengthFeet,
  })
}
</script>

<style scoped>
.setup-card {
  width: min(720px, 100%);
  border-radius: 24px;
}

.setup-card__next {
  padding-top: 4px;
}

.setup-card__next-title {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64785a;
}

.setup-card__next-grid {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.setup-card__next-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: #4d6047;
}
</style>
