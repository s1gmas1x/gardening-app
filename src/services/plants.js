function getApiBaseUrl() {
  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')

  if (configuredBaseUrl) {
    const isLocalhostTarget = /^(https?:\/\/)?(localhost|127(?:\.\d{1,3}){3})(:\d+)?$/i.test(configuredBaseUrl)
    const currentHostname = globalThis.location?.hostname || ''
    const isLocalhostRuntime = /^(localhost|127(?:\.\d{1,3}){3})$/i.test(currentHostname)

    if (isLocalhostTarget && !isLocalhostRuntime) {
      throw new Error('Plants API is still configured for localhost. Set VITE_API_BASE_URL for this deployment.')
    }

    return configuredBaseUrl
  }

  return globalThis.location?.origin || ''
}

function getTenantKey() {
  return import.meta.env.VITE_API_TENANT || 'garden'
}

export async function getPlantCatalog() {
  const apiBaseUrl = getApiBaseUrl()

  if (!apiBaseUrl) {
    throw new Error('Plants API base URL is not configured.')
  }

  const response = await fetch(`${apiBaseUrl}/api/plants`, {
    headers: {
      Accept: 'application/json',
      'X-Tenant': getTenantKey(),
    },
  })

  if (!response.ok) {
    throw new Error(`Unable to load plant catalog (${response.status}).`)
  }

  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    throw new Error('Plants API did not return JSON.')
  }

  return response.json()
}
