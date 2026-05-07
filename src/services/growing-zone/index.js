import { phzmApiGrowingZoneProvider } from './providers/phzmapi'

let activeProvider = phzmApiGrowingZoneProvider

export function getActiveGrowingZoneProvider() {
  return activeProvider
}

export function setActiveGrowingZoneProvider(provider) {
  activeProvider = provider
}

export async function suggestGrowingZone(input) {
  return activeProvider.getSuggestion(input)
}
