import { manualPlaceholderProvider } from './providers/manual-placeholder'

let activeProvider = manualPlaceholderProvider

export function getActiveFrostDateProvider() {
  return activeProvider
}

export function setActiveFrostDateProvider(provider) {
  activeProvider = provider
}

export async function suggestFrostDates(input) {
  return activeProvider.getSuggestion(input)
}
