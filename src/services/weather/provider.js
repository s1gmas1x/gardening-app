function normalizeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null
}

function normalizeString(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeCurrentConditions(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const temperatureF = normalizeNumber(value.temperatureF)
  const feelsLikeF = normalizeNumber(value.feelsLikeF)
  const windMph = normalizeNumber(value.windMph)
  const windGustMph = normalizeNumber(value.windGustMph)
  const humidityPercent = normalizeNumber(value.humidityPercent)

  return {
    temperatureF,
    feelsLikeF,
    windMph,
    windGustMph,
    humidityPercent,
    summary: normalizeString(value.summary),
    description: normalizeString(value.description),
    icon: normalizeString(value.icon),
  }
}

function normalizeForecastEntry(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const date = normalizeString(value.date)

  if (!date) {
    return null
  }

  return {
    date,
    lowTempF: normalizeNumber(value.lowTempF),
    highTempF: normalizeNumber(value.highTempF),
    temperatureF: normalizeNumber(value.temperatureF),
    precipitationChancePercent: normalizeNumber(value.precipitationChancePercent),
    windMph: normalizeNumber(value.windMph),
    windGustMph: normalizeNumber(value.windGustMph),
    summary: normalizeString(value.summary),
    description: normalizeString(value.description),
    icon: normalizeString(value.icon),
  }
}

function normalizeAlert(value, index) {
  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    id: normalizeString(value.id) || `alert-${index}`,
    source: normalizeString(value.source),
    event: normalizeString(value.event),
    headline: normalizeString(value.headline),
    severity: normalizeString(value.severity),
    startsAt: normalizeString(value.startsAt),
    endsAt: normalizeString(value.endsAt),
    description: normalizeString(value.description),
    instruction: normalizeString(value.instruction),
    areas: Array.isArray(value.areas)
      ? value.areas.filter((item) => typeof item === 'string')
      : [],
  }
}

export function normalizeWeatherSnapshot(value = {}) {
  return {
    source: normalizeString(value.source) || 'unknown',
    zipCode: normalizeString(value.zipCode),
    locationName: normalizeString(value.locationName),
    stateCode: normalizeString(value.stateCode),
    latitude: normalizeNumber(value.latitude),
    longitude: normalizeNumber(value.longitude),
    lastUpdatedAt: normalizeString(value.lastUpdatedAt),
    currentConditions: normalizeCurrentConditions(value.currentConditions),
    dailyForecast: Array.isArray(value.dailyForecast)
      ? value.dailyForecast.map(normalizeForecastEntry).filter(Boolean)
      : [],
    hourlyForecast: Array.isArray(value.hourlyForecast)
      ? value.hourlyForecast.map(normalizeForecastEntry).filter(Boolean)
      : [],
    activeAlerts: Array.isArray(value.activeAlerts)
      ? value.activeAlerts.map(normalizeAlert).filter(Boolean)
      : [],
  }
}

export function createWeatherProvider({ name, getSnapshot }) {
  return {
    name,
    async getSnapshot(input) {
      const result = await getSnapshot(input)

      return normalizeWeatherSnapshot({
        source: name,
        ...result,
      })
    },
  }
}
