<template>
  <q-card flat bordered class="calendar-card">
    <q-card-section class="row items-start justify-between q-col-gutter-md">
      <div class="col">
        <div class="text-subtitle1 text-weight-medium">Planting Calendar</div>
        <div class="text-caption text-grey-7">
          Tasks grouped by their scheduled due dates.
        </div>
      </div>

      <div class="col-auto text-caption text-grey-7">
        {{ datedTaskCount }}/{{ tasks.length }} dated
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section v-if="!months.length" class="text-caption text-grey-7">
      Add frost dates and crop plans to generate scheduled planting windows.
    </q-card-section>

    <div v-else class="calendar-card__months">
      <section v-for="month in months" :key="month.key" class="calendar-month">
        <div class="calendar-month__header">
          <div class="calendar-month__label">{{ month.label }}</div>
          <div class="calendar-month__meta">
            {{ month.tasks.length }} task<span v-if="month.tasks.length !== 1">s</span>
          </div>
        </div>

        <div class="calendar-month__tasks">
          <button
            v-for="task in month.tasks"
            :key="task.id"
            type="button"
            class="calendar-task"
            :class="{ 'calendar-task--done': task.done }"
            @click="$emit('focus-task', task)"
          >
            <div class="calendar-task__date">
              {{ formatTaskDate(task.dueDate) }}
            </div>
            <div class="calendar-task__body">
              <div class="calendar-task__title">{{ task.title }}</div>
              <div class="calendar-task__meta">
                {{ task.taskTypeLabel }} · {{ task.areaName }} · {{ task.placedCount }}/{{ task.targetQuantity }} placed
              </div>
            </div>
            <q-icon name="my_location" size="16px" class="calendar-task__icon" />
          </button>
        </div>
      </section>
    </div>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: {
    type: Array,
    required: true,
  },
})

defineEmits(['focus-task'])

function formatTaskDate(dateString) {
  if (!dateString) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateString}T00:00:00`))
}

const months = computed(() => {
  const grouped = new Map()

  props.tasks
    .filter((task) => task.dueDate)
    .forEach((task) => {
      const date = new Date(`${task.dueDate}T00:00:00`)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(date)

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label,
          tasks: [],
        })
      }

      grouped.get(key).tasks.push(task)
    })

  return [...grouped.values()].map((month) => ({
    ...month,
    tasks: month.tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.areaName.localeCompare(b.areaName)),
  }))
})

const datedTaskCount = computed(() => props.tasks.filter((task) => task.dueDate).length)
</script>

<style scoped>
.calendar-card {
  border-radius: 20px;
}

.calendar-card__months {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.calendar-month {
  padding: 14px 14px 12px;
  border: 1px solid #d9e4d2;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdf8 0%, #f5f9f1 100%);
}

.calendar-month__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.calendar-month__label {
  font-size: 0.98rem;
  font-weight: 700;
  color: #30422d;
}

.calendar-month__meta {
  font-size: 0.78rem;
  color: #6b7e64;
}

.calendar-month__tasks {
  display: grid;
  gap: 8px;
}

.calendar-task {
  display: grid;
  grid-template-columns: 72px 1fr 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbe4d5;
  border-radius: 14px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.calendar-task:hover {
  transform: translateY(-1px);
  border-color: #afc1a6;
  box-shadow: 0 10px 20px rgba(58, 73, 51, 0.08);
}

.calendar-task--done {
  opacity: 0.68;
}

.calendar-task__date {
  font-size: 0.8rem;
  font-weight: 700;
  color: #5f7259;
}

.calendar-task__body {
  min-width: 0;
}

.calendar-task__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.92rem;
  font-weight: 600;
  color: #263421;
}

.calendar-task__meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
  font-size: 0.78rem;
  color: #6b7e64;
}

.calendar-task__icon {
  color: #7c8c74;
}
</style>
