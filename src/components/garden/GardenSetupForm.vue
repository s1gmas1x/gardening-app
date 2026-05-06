<template>
  <q-card flat bordered class="setup-card">
    <q-card-section>
      <div class="text-overline text-positive">Start Fresh</div>
      <div class="text-h4 text-weight-bold">Set up the garden footprint</div>
      <div class="text-body1 text-grey-7 q-mt-sm">
        Start with the overall space in feet. Beds can be added and adjusted once the planner opens.
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
            Recommended for a first pass: `20 x 30 ft`
          </div>

          <q-btn color="positive" label="Open Planner" type="submit" />
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
</style>
