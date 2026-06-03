import { defineStore } from 'pinia'
import {
  BED_SNAP_FEET,
  DEFAULT_ZOOM,
  GRID_PADDING,
  MAX_ZOOM,
  MIN_ZOOM,
  buildAutoAreaName,
  clamp,
  clampBedToGarden,
  createDefaultBed,
  findNextBedPlacement,
  normalizeGardenDimensions,
  normalizeBedType,
  zoomAroundPoint,
} from 'src/utils/garden'

const STORAGE_KEY = 'gardening-app:garden'

function createDefaultState() {
  return {
    isInitialized: false,
    widthFeet: 20,
    lengthFeet: 30,
    beds: [],
    selectedBedId: null,
    interactionMode: 'select',
    viewport: {
      zoom: DEFAULT_ZOOM,
      panX: GRID_PADDING,
      panY: GRID_PADDING,
    },
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function buildPersistedSnapshot(state) {
  return {
    version: 1,
    state: {
      isInitialized: state.isInitialized,
      widthFeet: state.widthFeet,
      lengthFeet: state.lengthFeet,
      beds: state.beds.map((bed) => ({
        id: bed.id,
        name: bed.name,
        xFeet: bed.xFeet,
        yFeet: bed.yFeet,
        widthFeet: bed.widthFeet,
        heightFeet: bed.heightFeet,
        type: bed.type,
        bedHeightInches: bed.bedHeightInches,
        rotationDegrees: bed.rotationDegrees,
        locked: Boolean(bed.locked),
        color: bed.color,
        renderKind: bed.renderKind ?? null,
        renderTheme: bed.renderTheme ?? null,
        placementMode: bed.placementMode ?? null,
        borderEdge: bed.borderEdge ?? null,
      })),
      selectedBedId: state.selectedBedId,
      interactionMode: state.interactionMode,
      viewport: state.viewport,
    },
  }
}

function hydrateState(snapshot) {
  const defaults = createDefaultState()
  const source = snapshot?.state

  if (!source || typeof source !== 'object') {
    return defaults
  }

  const dimensions = normalizeGardenDimensions(source.widthFeet, source.lengthFeet)
  const beds = Array.isArray(source.beds)
    ? source.beds.map((bed) => clampBedToGarden({
      ...bed,
      renderKind: bed.renderKind ?? null,
      renderTheme: bed.renderTheme ?? null,
      placementMode: bed.placementMode ?? null,
      borderEdge: bed.borderEdge ?? null,
      locked: Boolean(bed.locked),
    }, dimensions))
    : []
  const selectedBedId = beds.some((bed) => bed.id === source.selectedBedId)
    ? source.selectedBedId
    : null

  return {
    ...defaults,
    isInitialized: Boolean(source.isInitialized),
    widthFeet: dimensions.widthFeet,
    lengthFeet: dimensions.lengthFeet,
    beds,
    selectedBedId,
    interactionMode: source.interactionMode === 'pan' ? 'pan' : 'select',
    viewport: {
      zoom: clamp(Number(source.viewport?.zoom) || DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM),
      panX: Number(source.viewport?.panX) || GRID_PADDING,
      panY: Number(source.viewport?.panY) || GRID_PADDING,
    },
  }
}

export const useGardenStore = defineStore('garden', {
  state: createDefaultState,

  getters: {
    hasGarden: (state) => state.widthFeet > 0 && state.lengthFeet > 0,
    gardenDimensions: (state) => ({
      widthFeet: state.widthFeet,
      lengthFeet: state.lengthFeet,
    }),
    selectedBed: (state) => state.beds.find((bed) => bed.id === state.selectedBedId) ?? null,
  },

  actions: {
    initializePersistence() {
      if (this._hasInitializedPersistence || !canUseLocalStorage()) {
        return
      }

      this._hasInitializedPersistence = true

      try {
        const rawSnapshot = window.localStorage.getItem(STORAGE_KEY)
        if (rawSnapshot) {
          Object.assign(this, hydrateState(JSON.parse(rawSnapshot)))
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }

      this.$subscribe(
        (_mutation, state) => {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedSnapshot(state)))
        },
        { detached: true },
      )
    },

    initializeGarden(widthFeet, lengthFeet) {
      const normalized = normalizeGardenDimensions(widthFeet, lengthFeet)

      this.isInitialized = true
      this.widthFeet = normalized.widthFeet
      this.lengthFeet = normalized.lengthFeet
      this.beds = []
      this.selectedBedId = null
      this.viewport = {
        zoom: DEFAULT_ZOOM,
        panX: GRID_PADDING,
        panY: GRID_PADDING,
      }
    },

    resetGarden() {
      Object.assign(this, createDefaultState())
    },

    setInteractionMode(mode) {
      this.interactionMode = mode === 'pan' ? 'pan' : 'select'
    },

    setSelectedBed(id) {
      this.selectedBedId = id
    },

    clearSelection() {
      this.selectedBedId = null
    },

    addBed(type = 'regular', overrides = {}) {
      const { useExactPlacement = false, ...bedOverrides } = overrides
      const normalizedType = normalizeBedType(type)
      const sequenceNumber = this.beds.filter((bed) => bed.type === normalizedType).length + 1
      const seededBed = createDefaultBed(
        this.beds.length,
        this.gardenDimensions,
        normalizedType,
        sequenceNumber,
      )
      const candidateBed = clampBedToGarden({
        ...seededBed,
        ...bedOverrides,
      }, this.gardenDimensions)
      const nextBed = useExactPlacement
        ? candidateBed
        : clampBedToGarden({
          ...candidateBed,
          ...findNextBedPlacement(this.beds, candidateBed, this.gardenDimensions),
        }, this.gardenDimensions)
      this.beds.push(nextBed)
      this.selectedBedId = nextBed.id
      return nextBed
    },

    updateBed(id, updates) {
      const index = this.beds.findIndex((bed) => bed.id === id)
      if (index === -1) {
        return
      }

      const currentBed = this.beds[index]
      const normalizedUpdates = currentBed.locked
        ? {
            ...updates,
            xFeet: currentBed.xFeet,
            yFeet: currentBed.yFeet,
            widthFeet: currentBed.widthFeet,
            heightFeet: currentBed.heightFeet,
            rotationDegrees: currentBed.rotationDegrees,
          }
        : updates
      const nextType = updates.type ? normalizeBedType(updates.type) : currentBed.type
      const nextName = typeof normalizedUpdates.name === 'string' ? normalizedUpdates.name : currentBed.name
      const currentAutoName = buildAutoAreaName(currentBed.type, this.getAreaSequenceNumber(currentBed))

      this.beds[index] = clampBedToGarden(
        {
          ...currentBed,
          ...normalizedUpdates,
          name: nextType !== currentBed.type && nextName === currentAutoName
            ? buildAutoAreaName(nextType, this.getNextTypeSequenceNumber(nextType, currentBed.id))
            : nextName,
        },
        this.gardenDimensions,
      )
    },

    moveBed(id, xFeet, yFeet) {
      this.updateBed(id, {
        xFeet,
        yFeet,
      })
    },

    resizeSelectedBed(widthFeet, heightFeet) {
      if (!this.selectedBedId) {
        return
      }

      this.updateBed(this.selectedBedId, {
        widthFeet,
        heightFeet,
      })
    },

    removeSelectedBed() {
      if (!this.selectedBedId) {
        return
      }

      this.beds = this.beds.filter((bed) => bed.id !== this.selectedBedId)
      this.selectedBedId = null
    },

    toggleBedLock(id, locked = null) {
      const bed = this.beds.find((item) => item.id === id)
      if (!bed) {
        return
      }

      this.updateBed(id, {
        locked: locked ?? !bed.locked,
      })
    },

    panViewport(deltaX, deltaY) {
      this.viewport.panX += deltaX
      this.viewport.panY += deltaY
    },

    setViewportZoom(nextZoom, point) {
      this.viewport = zoomAroundPoint(this.viewport, nextZoom, point)
    },

    nudgeZoom(direction, point = { x: 0, y: 0 }) {
      const delta = direction > 0 ? 0.25 : -0.25
      this.setViewportZoom(this.viewport.zoom + delta, point)
    },

    snapValue(value) {
      return Math.round(value / BED_SNAP_FEET) * BED_SNAP_FEET
    },

    updateGardenDimensions(widthFeet, lengthFeet) {
      const normalized = normalizeGardenDimensions(widthFeet, lengthFeet)
      this.isInitialized = true
      this.widthFeet = normalized.widthFeet
      this.lengthFeet = normalized.lengthFeet
      this.beds = this.beds.map((bed) => clampBedToGarden(bed, this.gardenDimensions))
    },

    getAreaSequenceNumber(targetBed) {
      const matchingBeds = this.beds.filter((bed) => bed.type === targetBed.type)
      return matchingBeds.findIndex((bed) => bed.id === targetBed.id) + 1
    },

    getNextTypeSequenceNumber(type, currentId = null) {
      return this.beds.filter((bed) => bed.type === type && bed.id !== currentId).length + 1
    },
  },
})
