function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(payload),
  }
}

function logWeatherDebug(label, payload) {
  console.log(`[weather-debug] ${label}`, JSON.stringify(payload, null, 2))
}

function buildSafeErrorDebug(stage, error, extra = {}) {
  return {
    stage,
    status: error?.status ?? null,
    message: error?.message ?? '',
    responsePreview: typeof error?.responseText === 'string'
      ? error.responseText.slice(0, 240)
      : '',
    ...extra,
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeDateTime(value) {
  return typeof value === 'number' ? new Date(value * 1000).toISOString() : ''
}

function normalizeDate(value) {
  return typeof value === 'number'
    ? new Date(value * 1000).toISOString().slice(0, 10)
    : ''
}

function toPercent(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : null
}

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null
}

function normalizeUnixMsDateTime(value) {
  return Number.isFinite(Number(value)) ? new Date(Number(value)).toISOString() : ''
}

function pickWeatherSummary(weather = []) {
  const current = Array.isArray(weather) ? weather[0] : null

  return {
    summary: normalizeText(current?.main),
    description: normalizeText(current?.description),
    icon: normalizeText(current?.icon),
  }
}

function summarizeDailyForecast(hourlyEntries = []) {
  const groupedEntries = new Map()

  hourlyEntries.forEach((entry) => {
    const date = normalizeDate(entry.dt)

    if (!date) {
      return
    }

    const current = groupedEntries.get(date) ?? {
      date,
      lowTempF: null,
      highTempF: null,
      precipitationChancePercent: 0,
      windMph: null,
      windGustMph: null,
      weather: [],
    }

    const nextTemp = toNumber(entry.main?.temp)
    const nextWind = toNumber(entry.wind?.speed)
    const nextGust = toNumber(entry.wind?.gust)
    const nextPop = toPercent(entry.pop)

    current.lowTempF = current.lowTempF === null || (nextTemp !== null && nextTemp < current.lowTempF)
      ? nextTemp
      : current.lowTempF
    current.highTempF = current.highTempF === null || (nextTemp !== null && nextTemp > current.highTempF)
      ? nextTemp
      : current.highTempF
    current.precipitationChancePercent = Math.max(current.precipitationChancePercent ?? 0, nextPop ?? 0)
    current.windMph = current.windMph === null || (nextWind !== null && nextWind > current.windMph)
      ? nextWind
      : current.windMph
    current.windGustMph = current.windGustMph === null || (nextGust !== null && nextGust > current.windGustMph)
      ? nextGust
      : current.windGustMph
    current.weather = entry.weather ?? current.weather

    groupedEntries.set(date, current)
  })

  return Array.from(groupedEntries.values())
    .slice(0, 7)
    .map((entry) => ({
      date: entry.date,
      lowTempF: entry.lowTempF,
      highTempF: entry.highTempF,
      precipitationChancePercent: entry.precipitationChancePercent,
      windMph: entry.windMph,
      windGustMph: entry.windGustMph,
      ...pickWeatherSummary(entry.weather),
    }))
}

function normalizeWeatherPayload({
  currentWeather,
  forecast,
  zipCode,
  latitude,
  longitude,
  locationName,
  stateCode,
}) {
  const forecastEntries = Array.isArray(forecast.list) ? forecast.list : []
  const currentSummary = pickWeatherSummary(currentWeather.weather)

  return {
    source: 'openweather',
    zipCode,
    latitude,
    longitude,
    locationName: locationName || normalizeText(currentWeather.name),
    stateCode,
    lastUpdatedAt: new Date().toISOString(),
    currentConditions: {
      temperatureF: toNumber(currentWeather.main?.temp),
      feelsLikeF: toNumber(currentWeather.main?.feels_like),
      windMph: toNumber(currentWeather.wind?.speed),
      windGustMph: toNumber(currentWeather.wind?.gust),
      humidityPercent: toNumber(currentWeather.main?.humidity),
      ...currentSummary,
    },
    dailyForecast: summarizeDailyForecast(forecastEntries),
    hourlyForecast: forecastEntries.slice(0, 24).map((entry) => ({
      date: normalizeDateTime(entry.dt),
      temperatureF: toNumber(entry.main?.temp),
      precipitationChancePercent: toPercent(entry.pop),
      windMph: toNumber(entry.wind?.speed),
      windGustMph: toNumber(entry.wind?.gust),
      ...pickWeatherSummary(entry.weather),
    })),
    activeAlerts: [],
  }
}

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text()
    const error = new Error(text || `Request failed with ${response.status}`)
    error.status = response.status
    error.responseText = text
    error.url = url
    throw error
  }

  return response.json()
}

const nwsWarningLayerUrls = [
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NWS_Watches_Warnings_v1/FeatureServer/8',
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NWS_Watches_Warnings_v1/FeatureServer/9',
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NWS_Watches_Warnings_v1/FeatureServer/10',
]

function normalizeNwsAlert(feature = {}, index = 0) {
  const attributes = feature?.attributes ?? {}

  return {
    id: normalizeText(attributes.Uid) || `nws-alert-${index}`,
    source: 'NWS via Esri',
    event: normalizeText(attributes.Event),
    headline: normalizeText(attributes.Summary),
    severity: normalizeText(attributes.Severity),
    startsAt: normalizeUnixMsDateTime(attributes.Start),
    endsAt: normalizeUnixMsDateTime(attributes.End_),
    description: normalizeText(attributes.Description),
    instruction: normalizeText(attributes.Instruction),
    areas: normalizeText(attributes.Affected)
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

async function fetchNwsAlerts(latitude, longitude) {
  const geometry = `${longitude},${latitude}`
  const outFields = [
    'Event',
    'Severity',
    'Summary',
    'Start',
    'End_',
    'Uid',
    'Affected',
    'Description',
    'Instruction',
  ].join(',')

  const layerResponses = await Promise.all(
    nwsWarningLayerUrls.map(async (baseUrl) => {
      const url = `${baseUrl}/query?where=1%3D1&geometry=${encodeURIComponent(geometry)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${encodeURIComponent(outFields)}&returnGeometry=false&f=json`
      const payload = await fetchJson(url)

      return Array.isArray(payload.features) ? payload.features : []
    }),
  )

  return layerResponses
    .flat()
    .map(normalizeNwsAlert)
    .filter((alert) => alert.event || alert.headline)
}

function buildAlertsOnlyPayload({
  zipCode,
  latitude,
  longitude,
  locationName,
  stateCode,
  activeAlerts,
}) {
  return {
    source: 'nws-alerts-only',
    zipCode,
    latitude,
    longitude,
    locationName,
    stateCode,
    lastUpdatedAt: new Date().toISOString(),
    currentConditions: null,
    dailyForecast: [],
    hourlyForecast: [],
    activeAlerts,
  }
}

export async function handler(event) {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    return json(500, {
      error: 'Weather provider is not configured.',
      debug: {
        stage: 'missing-api-key',
        hasApiKey: false,
      },
    })
  }

  const zipCode = normalizeText(event.queryStringParameters?.zipCode).trim()
  const lat = toNumber(event.queryStringParameters?.lat)
  const lon = toNumber(event.queryStringParameters?.lon)
  let locationName = normalizeText(event.queryStringParameters?.locationName).trim()
  let stateCode = normalizeText(event.queryStringParameters?.stateCode).trim()
  let latitude = lat
  let longitude = lon

  logWeatherDebug('incoming-request', {
    zipCode,
    latitude,
    longitude,
    locationName,
    stateCode,
    hasApiKey: Boolean(apiKey),
  })

  if (latitude === null || longitude === null) {
    if (!/^\d{5}$/.test(zipCode)) {
      return json(400, {
        error: 'Provide a 5-digit ZIP code or numeric lat/lon.',
        debug: {
          stage: 'invalid-location-input',
          zipCode,
          latitude,
          longitude,
        },
      })
    }

    try {
      const zipLookup = await fetchJson(
        `https://api.openweathermap.org/geo/1.0/zip?zip=${encodeURIComponent(`${zipCode},US`)}&appid=${encodeURIComponent(apiKey)}`,
      )

      logWeatherDebug('zip-lookup-response', {
        name: zipLookup.name,
        state: zipLookup.state,
        lat: zipLookup.lat,
        lon: zipLookup.lon,
      })

      latitude = toNumber(zipLookup.lat)
      longitude = toNumber(zipLookup.lon)
      locationName = locationName || normalizeText(zipLookup.name)
      stateCode = stateCode || normalizeText(zipLookup.state)
    } catch (error) {
      logWeatherDebug('zip-lookup-error', {
        message: error.message,
        status: error.status ?? null,
        responseText: error.responseText ?? '',
      })
      return json(502, {
        error: 'Unable to resolve that location for weather lookup.',
        debug: buildSafeErrorDebug('zip-lookup-error', error, {
          zipCode,
        }),
      })
    }
  }

  if (latitude === null || longitude === null) {
    return json(400, {
      error: 'Unable to resolve a valid latitude and longitude.',
      debug: {
        stage: 'invalid-lat-lon',
        zipCode,
        latitude,
        longitude,
      },
    })
  }

  try {
    const [currentWeather, forecast] = await Promise.all([
      fetchJson(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=imperial&appid=${encodeURIComponent(apiKey)}`,
      ),
      fetchJson(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=imperial&appid=${encodeURIComponent(apiKey)}`,
      ),
    ])

    logWeatherDebug('weather-fetch-success', {
      source: 'openweather',
      latitude,
      longitude,
      currentName: currentWeather.name,
      forecastCount: Array.isArray(forecast.list) ? forecast.list.length : 0,
    })

    return json(200, normalizeWeatherPayload({
      currentWeather,
      forecast,
      zipCode,
      latitude,
      longitude,
      locationName,
      stateCode,
    }))
  } catch (error) {
    logWeatherDebug('weather-fetch-error', {
      message: error.message,
      status: error.status ?? null,
      responseText: error.responseText ?? '',
    })

    try {
      const activeAlerts = await fetchNwsAlerts(latitude, longitude)

      logWeatherDebug('nws-alert-fetch-success', {
        latitude,
        longitude,
        alertCount: activeAlerts.length,
      })

      if (activeAlerts.length > 0) {
        return json(200, buildAlertsOnlyPayload({
          zipCode,
          latitude,
          longitude,
          locationName,
          stateCode,
          activeAlerts,
        }))
      }
    } catch (alertsError) {
      logWeatherDebug('nws-alert-fetch-error', {
        message: alertsError.message,
        status: alertsError.status ?? null,
        responseText: alertsError.responseText ?? '',
      })
    }

    return json(502, {
      error: 'Unable to load weather data right now.',
      debug: buildSafeErrorDebug('weather-fetch-error', error, {
        latitude,
        longitude,
      }),
    })
  }
}
