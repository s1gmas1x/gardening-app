import { netlifyWeatherProvider } from './providers/netlify-weather'

let activeProvider = netlifyWeatherProvider

export function getActiveWeatherProvider() {
  return activeProvider
}

export function setActiveWeatherProvider(provider) {
  activeProvider = provider
}

export async function getWeatherSnapshot(input) {
  return activeProvider.getSnapshot(input)
}
