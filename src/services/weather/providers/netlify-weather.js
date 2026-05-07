import { createWeatherProvider } from '../provider'

function buildQuery(input = {}) {
  const params = new URLSearchParams()

  if (typeof input.zipCode === 'string' && input.zipCode.trim()) {
    params.set('zipCode', input.zipCode.trim())
  }

  if (Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude))) {
    params.set('lat', String(Number(input.latitude)))
    params.set('lon', String(Number(input.longitude)))
  }

  if (typeof input.locationName === 'string' && input.locationName.trim()) {
    params.set('locationName', input.locationName.trim())
  }

  if (typeof input.stateCode === 'string' && input.stateCode.trim()) {
    params.set('stateCode', input.stateCode.trim())
  }

  return params.toString()
}

export const netlifyWeatherProvider = createWeatherProvider({
  name: 'openweather-netlify',
  async getSnapshot(input) {
    const query = buildQuery(input)
    const url = `/.netlify/functions/weather${query ? `?${query}` : ''}`
    console.log('[weather-debug] client-request', {
      url,
      input,
    })
    const response = await fetch(url)
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      const errorPayload = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : { error: await response.text().catch(() => '') }
      console.error('[weather-debug] client-response-error', {
        status: response.status,
        contentType,
        errorPayload,
      })
      throw new Error(errorPayload.error || 'Weather lookup failed.')
    }

    if (!contentType.includes('application/json')) {
      const rawText = await response.text().catch(() => '')
      console.error('[weather-debug] client-response-non-json', {
        status: response.status,
        contentType,
        rawTextPreview: rawText.slice(0, 240),
      })
      throw new Error(
        'Weather function returned HTML instead of JSON. Run the app through Netlify functions locally, such as `netlify dev`, or test on the deployed site.',
      )
    }

    const payload = await response.json()
    console.log('[weather-debug] client-response-success', {
      source: payload.source,
      locationName: payload.locationName,
      dailyForecastCount: Array.isArray(payload.dailyForecast) ? payload.dailyForecast.length : 0,
      hourlyForecastCount: Array.isArray(payload.hourlyForecast) ? payload.hourlyForecast.length : 0,
      activeAlertsCount: Array.isArray(payload.activeAlerts) ? payload.activeAlerts.length : 0,
    })
    return payload
  },
})
