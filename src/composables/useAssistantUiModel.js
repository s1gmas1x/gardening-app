import { computed } from 'vue'

export function useAssistantUiModel(todayDashboard) {
  const assistantDefaultSection = computed(() => 'rhythm')

  const assistantRailButtons = computed(() => ([
    {
      section: 'rhythm',
      tooltip: 'Open Garden Rhythm',
      iconPaths: [
        { d: 'M12 5.5C15.6 5.5 18.5 8.4 18.5 12C18.5 15.6 15.6 18.5 12 18.5C8.4 18.5 5.5 15.6 5.5 12C5.5 8.4 8.4 5.5 12 5.5Z' },
        { d: 'M8.2 12H10.3L11.3 9.4L12.9 14.2L14 12.8H15.8' },
      ],
    },
    {
      section: 'tasks',
      tooltip: 'Open Tasks',
      iconPaths: [
        { d: 'M7 12.5L10 15.5L17 8.5' },
        { d: 'M7 8H17' },
        { d: 'M7 12H9' },
        { d: 'M7 16H9' },
      ],
    },
    {
      section: 'weather',
      tooltip: 'Open Weather',
      iconPaths: [
        { d: 'M8 15.5H16C17.6569 15.5 19 14.1569 19 12.5C19 10.8431 17.6569 9.5 16 9.5C15.8 6.9 13.7 5 11 5C8.8 5 7 6.8 7 9C5.3 9.2 4 10.7 4 12.5C4 14.3 5.7 15.5 8 15.5Z' },
        { d: 'M9 18H15' },
      ],
    },
    {
      section: 'trays',
      tooltip: 'Open Trays',
      iconPaths: [
        { d: 'M7 9H17L15.5 18H8.5L7 9Z' },
        { d: 'M6 7H18' },
      ],
    },
    {
      section: 'alerts',
      tooltip: 'Open Alerts',
      iconPaths: [
        { d: 'M12 5C14.2 5 16 6.8 16 9V12.3L17.5 14.5H6.5L8 12.3V9C8 6.8 9.8 5 12 5Z' },
        { d: 'M10.8 17.2C11.1 17.8 11.5 18.2 12 18.2C12.5 18.2 12.9 17.8 13.2 17.2' },
      ],
    },
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
