import { computed } from 'vue'

function formatMonthDay(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatMonthDayYear(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function usePlannerTasks(scheduleStore) {
  const plannerTasks = computed(() => scheduleStore.plantingTasks.map((task) => ({
    ...task,
    taskTypeLabel: task.taskType === 'start_indoors'
      ? 'Start Indoors'
      : task.taskType === 'transplant'
        ? 'Transplant'
        : 'Direct Sow',
    dueDateLabel: task.dueDate ? formatMonthDayYear(task.dueDate) : '',
    batchTimingLabel: [
      task.batchStartIndoorDate ? `Start ${formatMonthDay(task.batchStartIndoorDate)}` : '',
      task.batchTransplantDate ? `Transplant ${formatMonthDay(task.batchTransplantDate)}` : '',
      task.batchDirectSowDate ? `Sow ${formatMonthDay(task.batchDirectSowDate)}` : '',
    ].filter(Boolean).join(' · '),
  })))

  const completedTaskCount = computed(() => plannerTasks.value.filter((task) => task.done).length)

  return {
    plannerTasks,
    completedTaskCount,
  }
}
