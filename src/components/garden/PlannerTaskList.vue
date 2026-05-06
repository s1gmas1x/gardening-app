<template>
  <q-card flat bordered class="task-card">
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">Planting Tasks</div>
        <div class="text-caption text-grey-7">
          Tasks generated from the current crop plans and what is already placed in the garden.
        </div>
      </div>

      <div class="col-auto text-caption text-grey-7">
        {{ completedCount }}/{{ tasks.length }} done
      </div>
    </q-card-section>

    <q-separator />

    <q-list v-if="tasks.length" separator>
      <q-item v-for="task in tasks" :key="task.id" class="task-item">
        <q-item-section avatar top>
          <q-checkbox
            :model-value="task.done"
            color="positive"
            @update:model-value="$emit('toggle-task', { taskId: task.id, done: $event })"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label :class="{ 'task-item__title--done': task.done }">
            {{ task.title }}
          </q-item-label>
          <q-item-label caption>
            {{ task.taskTypeLabel }} · {{ task.areaName }}
          </q-item-label>
          <q-item-label v-if="task.notes" caption class="task-item__notes">
            {{ task.notes }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <q-card-section v-else class="text-caption text-grey-7">
      Add crop plans and target quantities to generate planting tasks.
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  tasks: {
    type: Array,
    required: true,
  },
  completedCount: {
    type: Number,
    required: true,
  },
})

defineEmits(['toggle-task'])
</script>

<style scoped>
.task-card {
  border-radius: 20px;
}

.task-item__title--done {
  text-decoration: line-through;
  color: #6c7d69;
}

.task-item__notes {
  margin-top: 2px;
}
</style>
