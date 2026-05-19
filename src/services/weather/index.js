import { laravelWeatherProvider } from './providers/laravel-weather'

let activeProvider = laravelWeatherProvider

export function getActiveWeatherProvider() {
  return activeProvider
}

export function setActiveWeatherProvider(provider) {
  activeProvider = provider
}

export async function getWeatherSnapshot(input) {
  return activeProvider.getSnapshot(input)
}
