function normalizeString(value) {
  return typeof value === 'string' ? value : ''
}

export function normalizeGrowingZoneSuggestion(result = {}) {
  return {
    source: normalizeString(result.source) || 'unknown',
    zipCode: normalizeString(result.zipCode),
    locationName: normalizeString(result.locationName),
    zone: normalizeString(result.zone),
    confidence: normalizeString(result.confidence) || 'suggested',
    notes: normalizeString(result.notes),
    rawPayload: result.rawPayload && typeof result.rawPayload === 'object' ? result.rawPayload : null,
  }
}

export function createGrowingZoneProvider({ name, getSuggestion }) {
  return {
    name,
    async getSuggestion(input) {
      const result = await getSuggestion(input)

      return normalizeGrowingZoneSuggestion({
        source: name,
        ...result,
      })
    },
  }
}
