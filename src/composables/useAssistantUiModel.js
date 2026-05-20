import { computed } from 'vue'

export function useAssistantUiModel(todayDashboard) {
  const assistantDefaultSection = computed(() => 'rhythm')

  const assistantRailButtons = computed(() => ([
    { section: 'rhythm', icon: 'event_repeat', tooltip: 'Open Garden Rhythm' },
    { section: 'tasks', icon: 'task_alt', tooltip: 'Open Tasks' },
    { section: 'weather', icon: 'cloud', tooltip: 'Open Weather' },
    { section: 'trays', icon: 'spa', tooltip: 'Open Trays' },
    { section: 'alerts', icon: 'notification_important', tooltip: 'Open Alerts' },
  ]))

  const assistantTabs = computed(() => ([
    { name: 'rhythm', label: 'Rhythm', icon: 'event_repeat' },
    { name: 'tasks', label: 'Tasks', icon: 'format_list_bulleted' },
    { name: 'trays', label: 'Trays', icon: 'spa' },
    { name: 'weather', label: 'Weather', icon: 'cloud' },
    { name: 'alerts', label: 'Alerts', icon: 'notification_important' },
  ]))

  const assistantAlertCount = computed(() => (
    todayDashboard.value.weatherRisks.length + todayDashboard.value.dueToday.length
  ))

  return {
    assistantDefaultSection,
    assistantRailButtons,
    assistantTabs,
    assistantAlertCount,
  }
}
