import { createWeatherProvider } from '../provider'

function isHtmlResponse(contentType = '', text = '') {
  return contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)
}

function buildWeatherErrorMessage({ status, contentType = '', errorPayload = {}, rawText = '' }) {
  const payloadMessage = typeof errorPayload.error === 'string' ? errorPayload.error.trim() : ''
  const looksLikeHtml = isHtmlResponse(contentType, payloadMessage || rawText)

  if (status >= 500) {
    return looksLikeHtml
      ? 'Weather service is temporarily unavailable. Please try again shortly.'
      : (payloadMessage || 'Weather service is temporarily unavailable. Please try again shortly.')
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

function getApiBaseUrl() {
  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')

  if (configuredBaseUrl) {
    const isLocalhostTarget = /^(https?:\/\/)?(localhost|127(?:\.\d{1,3}){3})(:\d+)?$/i.test(configuredBaseUrl)
    const currentHostname = globalThis.location?.hostname || ''
    const isLocalhostRuntime = /^(localhost|127(?:\.\d{1,3}){3})$/i.test(currentHostname)

    if (isLocalhostTarget && !isLocalhostRuntime) {
      throw new Error('Weather API is still configured for localhost. Set VITE_API_BASE_URL for this deployment.')
    }

    return configuredBaseUrl
  }

  return globalThis.location?.origin || ''
}

function getTenantKey() {
  return import.meta.env.VITE_API_TENANT || 'garden'
}

export const laravelWeatherProvider = createWeatherProvider({
  name: 'laravel-weather',
  async getSnapshot(input) {
    const query = buildQuery(input)
    const apiBaseUrl = getApiBaseUrl()

    if (!apiBaseUrl) {
      throw new Error('Weather API base URL is not configured.')
    }

    const url = `${apiBaseUrl}/api/weather${query ? `?${query}` : ''}`
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Tenant': getTenantKey(),
      },
    })
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      const rawText = contentType.includes('application/json')
        ? ''
        : await response.text().catch(() => '')
      const errorPayload = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : { error: rawText }
      throw new Error(buildWeatherErrorMessage({
        status: response.status,
        contentType,
        errorPayload,
        rawText,
      }))
    }

    if (!contentType.includes('application/json')) {
      const rawText = await response.text().catch(() => '')
      throw new Error(buildWeatherErrorMessage({
        status: response.status,
        contentType,
        rawText,
      }))
    }

    return response.json()
  },
})
