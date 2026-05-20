import { computed } from 'vue'

function getTodayDateString() {
  const now = new Date()
  return [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
  ].join('-')
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)

  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, '0'),
    `${date.getDate()}`.padStart(2, '0'),
  ].join('-')
}

function formatShortDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDayOrdinal(dayNumber) {
  const remainderTen = dayNumber % 10
  const remainderHundred = dayNumber % 100

  if (remainderTen === 1 && remainderHundred !== 11) {
    return `${dayNumber}st`
  }

  if (remainderTen === 2 && remainderHundred !== 12) {
    return `${dayNumber}nd`
  }

  if (remainderTen === 3 && remainderHundred !== 13) {
    return `${dayNumber}rd`
  }

  return `${dayNumber}th`
}

function buildChip(token) {
  if (token === 'overdue') {
    return { chipLabel: 'overdue', chipColor: 'negative' }
  }

  if (token === 'today') {
    return { chipLabel: 'today', chipColor: 'positive' }
  }

  if (token === 'warning') {
    return { chipLabel: 'warning', chipColor: 'warning' }
  }

  return { chipLabel: 'upcoming', chipColor: 'secondary' }
}

function priorityFromChip(token) {
  if (token === 'warning') {
    return 0
  }

  if (token === 'overdue') {
    return 1
  }

  if (token === 'today') {
    return 2
  }

  return 3
}

function compareDashboardItems(a, b) {
  return (a.priority ?? 99) - (b.priority ?? 99)
    || (a.dateKey ?? '').localeCompare(b.dateKey ?? '')
    || a.title.localeCompare(b.title)
}

export function useTodayDashboard({ scheduleStore, plannerTasks, traySummaries, trayDemands }) {
  return computed(() => {
    const today = getTodayDateString()
    const endOfWeek = addDays(today, 7)
    const todayDate = new Date(`${today}T00:00:00`)
    const todayLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(todayDate)
    const todayDayLabel = formatDayOrdinal(todayDate.getDate())
    const todayMonthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
    }).format(todayDate)
    const openTasks = plannerTasks.value.filter((task) => !task.done)

    const dueToday = openTasks
      .filter((task) => task.dueDate && task.dueDate <= today)
      .map((task) => {
        const chipToken = task.dueDate < today ? 'overdue' : 'today'

        return {
          id: `task-${task.id}`,
          title: task.title,
          meta: [
            task.taskTypeLabel,
            task.areaName,
            task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : '',
          ].filter(Boolean).join(' · '),
          note: task.progressText || task.batchTimingLabel || '',
          dateKey: task.dueDate || '',
          priority: priorityFromChip(chipToken),
          ...buildChip(chipToken),
        }
      })
      .sort(compareDashboardItems)

    const batchIdsWithUpcomingTasks = new Set()
    const upcomingTaskItems = openTasks
      .filter((task) => task.dueDate && task.dueDate > today && task.dueDate <= endOfWeek)
      .map((task) => {
        batchIdsWithUpcomingTasks.add(task.batchId)

        return {
          id: `task-${task.id}`,
          title: task.title,
          meta: `${task.taskTypeLabel} · ${task.areaName} · Due ${formatShortDate(task.dueDate)}`,
          note: task.batchTimingLabel || task.progressText || '',
          dateKey: task.dueDate,
          priority: priorityFromChip('upcoming'),
          ...buildChip('upcoming'),
        }
      })

    const weeklyBatchCount = scheduleStore.plantingBatches.filter((batch) => (
      [batch.startIndoorDate, batch.transplantDate, batch.directSowDate]
        .filter(Boolean)
        .some((dateValue) => dateValue > today && dateValue <= endOfWeek)
    )).length

    const upcomingBatchItems = scheduleStore.plantingBatches
      .filter((batch) => batch.remainingCount > 0 && !batchIdsWithUpcomingTasks.has(batch.id))
      .flatMap((batch) => {
        const windows = [
          batch.startIndoorDate
            ? {
                id: `batch-${batch.id}-start`,
                title: `Indoor start window for ${batch.plantName}`,
                meta: `Batch planning · ${batch.areaName} · ${formatShortDate(batch.startIndoorDate)}`,
                note: `${batch.remainingCount} still planned in this batch.`,
                dateKey: batch.startIndoorDate,
              }
            : null,
          batch.transplantDate
            ? {
                id: `batch-${batch.id}-transplant`,
                title: `Transplant window for ${batch.plantName}`,
                meta: `Batch planning · ${batch.areaName} · ${formatShortDate(batch.transplantDate)}`,
                note: `${batch.remainingCount} still planned in this batch.`,
                dateKey: batch.transplantDate,
              }
            : null,
          batch.directSowDate
            ? {
                id: `batch-${batch.id}-sow`,
                title: `Direct sow window for ${batch.plantName}`,
                meta: `Batch planning · ${batch.areaName} · ${formatShortDate(batch.directSowDate)}`,
                note: `${batch.remainingCount} still planned in this batch.`,
                dateKey: batch.directSowDate,
              }
            : null,
        ].filter(Boolean)

        return windows.filter((entry) => entry.dateKey > today && entry.dateKey <= endOfWeek)
      })
      .map((item) => ({
        ...item,
        priority: priorityFromChip('upcoming'),
        ...buildChip('upcoming'),
      }))

    const activeWeatherAlertItems = scheduleStore.activeAlerts.map((alert) => ({
      id: `alert-${alert.id}`,
      title: alert.event || 'Active weather alert',
      meta: [
        alert.severity || 'Weather alert',
        alert.startsAt ? `Starts ${formatDateTime(alert.startsAt)}` : '',
        alert.endsAt ? `Ends ${formatDateTime(alert.endsAt)}` : '',
      ].filter(Boolean).join(' · '),
      note: alert.headline || alert.description || 'Review timing before outdoor work.',
      dateKey: alert.startsAt || '',
      priority: priorityFromChip('warning'),
      ...buildChip('warning'),
    }))

    const weatherFlagItems = [
      scheduleStore.hasFreezeRisk
        ? {
            id: 'risk-freeze',
            title: 'Freeze risk in the 7-day outlook',
            meta: 'Weather flag · Watch low overnight temperatures.',
            note: 'Check coverings and timing before outdoor planting work.',
            dateKey: '',
            priority: priorityFromChip('warning'),
            ...buildChip('warning'),
          }
        : null,
      scheduleStore.hasHeatRisk
        ? {
            id: 'risk-heat',
            title: 'Heat stress possible this week',
            meta: 'Weather flag · High daytime temperatures ahead.',
            note: 'Plan heavier work earlier in the day and watch water demand.',
            dateKey: '',
            priority: priorityFromChip('warning'),
            ...buildChip('warning'),
          }
        : null,
      scheduleStore.hasWindRisk
        ? {
            id: 'risk-wind',
            title: 'High wind may affect outdoor work',
            meta: 'Weather flag · Wind or gusts cross the current threshold.',
            note: 'Avoid delicate transplant or hardening-off work during peak wind.',
            dateKey: '',
            priority: priorityFromChip('warning'),
            ...buildChip('warning'),
          }
        : null,
    ].filter(Boolean)
    const todayForecast = scheduleStore.dailyForecast[0] ?? null

    const transplantReadyItems = traySummaries.value
      .flatMap((tray) => tray.assignments
        .filter((assignment) => assignment.status === 'ready_to_transplant')
        .map((assignment) => ({
          id: `assignment-${assignment.id}`,
          title: `${assignment.plantName} is ready to transplant`,
          meta: `${tray.name} · ${assignment.areaName} · ${assignment.cellCount} cells`,
          note: assignment.transplantDate
            ? `Target transplant window ${formatShortDate(assignment.transplantDate)}.`
            : 'Tray cells are marked ready to transplant.',
          dateKey: assignment.transplantDate || '',
          priority: priorityFromChip('warning'),
          ...buildChip('warning'),
        })))

    const trayLoadItems = traySummaries.value
      .filter((tray) => tray.assignments.length > 0 && tray.status !== 'complete')
      .map((tray) => ({
        id: `tray-${tray.id}`,
        title: `${tray.name} is in active rotation`,
        meta: `${tray.statusLabel} · ${tray.usedCells}/${tray.cellCount} cells used`,
        note: tray.transplantStartDate
          ? `Current transplant window starts ${formatShortDate(tray.transplantStartDate)}.`
          : `${tray.openCells} open cells remain in this tray.`,
        dateKey: tray.transplantStartDate || '',
        priority: priorityFromChip('upcoming'),
        ...buildChip('upcoming'),
      }))

    const trayDemandItems = trayDemands.value.slice(0, 3).map((demand) => ({
      id: `demand-${demand.batchId}`,
      title: `${demand.plantName} still needs tray space`,
      meta: `${demand.areaName} · ${demand.remainingCells} cells unassigned`,
      note: demand.recommendedTrayName
        ? `Best fit right now: ${demand.recommendedTrayName}.`
        : 'Create or repurpose tray space for this batch.',
      dateKey: demand.startIndoorDate || demand.transplantDate || '',
      priority: priorityFromChip('upcoming'),
      ...buildChip('upcoming'),
    }))

    return {
      todayLabel,
      todayDayLabel,
      todayMonthLabel,
      dueToday,
      dueTodayMeta: dueToday.length
        ? `${dueToday.filter((item) => item.chipLabel === 'overdue').length} overdue first`
        : `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} in the planner`,
      upcomingThisWeek: [...upcomingTaskItems, ...upcomingBatchItems]
        .sort(compareDashboardItems)
        .slice(0, 6),
      upcomingMeta: `${weeklyBatchCount} planting window${weeklyBatchCount === 1 ? '' : 's'} this week`,
      weatherRisks: [...activeWeatherAlertItems, ...weatherFlagItems].sort(compareDashboardItems),
      weatherMeta: scheduleStore.hasActiveWeatherAlerts
        ? `${scheduleStore.activeAlerts.length} active alert${scheduleStore.activeAlerts.length === 1 ? '' : 's'}`
        : scheduleStore.lastUpdatedAt
          ? `Updated ${formatDateTime(scheduleStore.lastUpdatedAt)}`
          : 'Refresh the sky view to update risk flags',
      todayWeatherHigh: Number.isFinite(Number(todayForecast?.highTempF)) ? Number(todayForecast.highTempF) : null,
      todayWeatherLow: Number.isFinite(Number(todayForecast?.lowTempF)) ? Number(todayForecast.lowTempF) : null,
      propagationStatus: [...transplantReadyItems, ...trayLoadItems, ...trayDemandItems]
        .sort(compareDashboardItems)
        .slice(0, 6),
      propagationMeta: `${traySummaries.value.length} tray${traySummaries.value.length === 1 ? '' : 's'} · ${trayDemands.value.length} active demand${trayDemands.value.length === 1 ? '' : 's'}`,
    }
  })
}
