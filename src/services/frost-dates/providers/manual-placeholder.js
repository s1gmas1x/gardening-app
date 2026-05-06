import { createFrostDateProvider } from '../provider'

export const manualPlaceholderProvider = createFrostDateProvider({
  name: 'manual-placeholder',
  async getSuggestion({ zipCode = '', locationName = '' }) {
    return {
      zipCode,
      locationName,
      lastFrostDate: '',
      firstFrostDate: '',
      confidence: 'unavailable',
      notes: 'Automatic frost-date suggestion is not configured yet. Enter frost dates manually for now.',
    }
  },
})
