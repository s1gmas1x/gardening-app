export function normalizeFrostDateSuggestion(result = {}) {
  return {
    source: typeof result.source === 'string' ? result.source : 'unknown',
    zipCode: typeof result.zipCode === 'string' ? result.zipCode : '',
    locationName: typeof result.locationName === 'string' ? result.locationName : '',
    lastFrostDate: typeof result.lastFrostDate === 'string' ? result.lastFrostDate : '',
    firstFrostDate: typeof result.firstFrostDate === 'string' ? result.firstFrostDate : '',
    confidence: typeof result.confidence === 'string' ? result.confidence : 'suggested',
    notes: typeof result.notes === 'string' ? result.notes : '',
  }
}

export function createFrostDateProvider({ name, getSuggestion }) {
  return {
    name,
    async getSuggestion(input) {
      const result = await getSuggestion(input)
      return normalizeFrostDateSuggestion({
        source: name,
        ...result,
      })
    },
  }
}
