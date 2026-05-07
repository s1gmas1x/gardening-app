import { createWeatherProvider } from '../provider'

function isHtmlResponse(contentType = '', text = '') {
  return contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)
}

function buildWeatherErrorMessage({ status, contentType = '', errorPayload = {}, rawText = '' }) {
  const payloadMessage = typeof errorPayload.error === 'string' ? errorPayload.error.trim() : ''
  const looksLikeHtml = isHtmlResponse(contentType, payloadMessage || rawText)

  if (status === 502 && looksLikeHtml) {
    return 'Weather service is temporarily unavailable. Please try again in a few minutes.'
  }

  if (status >= 500) {
    return payloadMessage || 'Weather service is temporarily unavailable. Please try again shortly.'
  }

  if (payloadMessage && !looksLikeHtml) {
    return payloadMessage
  }

  return 'Unable to load weather data right now.'
}

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
      const rawText = contentType.includes('application/json')
        ? ''
        : await response.text().catch(() => '')
      const errorPayload = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : { error: rawText }
      const errorMessage = buildWeatherErrorMessage({
        status: response.status,
        contentType,
        errorPayload,
        rawText,
      })

      console.error('[weather-debug] client-response-error', {
        status: response.status,
        contentType,
        errorPayload,
        sanitizedMessage: errorMessage,
      })
      throw new Error(errorMessage)
    }

    if (!contentType.includes('application/json')) {
      const rawText = await response.text().catch(() => '')
      const errorMessage = buildWeatherErrorMessage({
        status: response.status,
        contentType,
        rawText,
      })
      console.error('[weather-debug] client-response-non-json', {
        status: response.status,
        contentType,
        rawTextPreview: rawText.slice(0, 240),
        sanitizedMessage: errorMessage,
      })
      throw new Error(errorMessage)
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
