import { createGrowingZoneProvider } from '../provider'

export const phzmApiGrowingZoneProvider = createGrowingZoneProvider({
  name: 'phzmapi',
  async getSuggestion({ zipCode = '', locationName = '', latitude = null, longitude = null }) {
    const normalizedZipCode = typeof zipCode === 'string' ? zipCode.trim() : ''

    if (!/^\d{5}$/.test(normalizedZipCode)) {
      return {
        zipCode: normalizedZipCode,
        locationName,
        zone: '',
        confidence: 'unavailable',
        notes: Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
          ? 'Growing zone lookup is currently ZIP-based. Enter a ZIP code or use the manual USDA zone override.'
          : 'Enter a valid ZIP code or use the manual USDA zone override.',
        rawPayload: null,
      }
    }

    try {
      const response = await fetch(`https://phzmapi.org/${normalizedZipCode}.json`)

      if (!response.ok) {
        throw new Error('Growing zone lookup failed.')
      }

      const payload = await response.json()

      return {
        zipCode: normalizedZipCode,
        locationName: payload.location || locationName,
        zone: typeof payload.zone === 'string' ? payload.zone : '',
        confidence: typeof payload.zone === 'string' && payload.zone ? 'lookup' : 'unavailable',
        notes: typeof payload.zone === 'string' && payload.zone
          ? 'USDA hardiness zone lookup from PHZM ZIP dataset.'
          : 'Zone lookup unavailable for this ZIP code. Use the manual USDA zone override.',
        rawPayload: payload,
      }
    } catch {
      return {
        zipCode: normalizedZipCode,
        locationName,
        zone: '',
        confidence: 'unavailable',
        notes: 'Zone lookup unavailable right now. Use the manual USDA zone override.',
        rawPayload: null,
      }
    }
  },
})
