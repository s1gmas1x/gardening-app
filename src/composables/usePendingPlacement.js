import { computed, ref } from 'vue'
import { bedSupportsHeight, clamp, feetToPixels, getBedFootprint, pixelsToFeet } from 'src/utils/garden'

function getNextBorderEdge(currentEdge = 'bottom') {
  const edges = ['bottom', 'left', 'top', 'right']
  const currentIndex = Math.max(edges.indexOf(currentEdge), 0)
  return edges[(currentIndex + 1) % edges.length]
}

export function usePendingPlacement({
  $q,
  gardenStore,
  captureItems,
  isMobileCaptureMode,
  activeCanvasTool,
  isCapturePanelOpen,
  addArea,
}) {
  const pendingPlacement = ref(null)
  const isPendingPlacementPinned = ref(false)
  const isPlacementToolbarHovered = ref(false)

  const pendingPlacementTemplate = computed(() => (
    captureItems.find((item) => item.value === pendingPlacement.value?.value) ?? null
  ))

  const isPendingPlacementToolbarVisible = computed(() => (
    Boolean(pendingPlacement.value) && (isMobileCaptureMode.value || isPendingPlacementPinned.value)
  ))

  const pendingPlacementSizeLabel = computed(() => (
    pendingPlacement.value
      ? `${pendingPlacement.value.widthFeet} x ${pendingPlacement.value.heightFeet} ft`
        + (bedSupportsHeight(pendingPlacement.value.type) ? ` · ${pendingPlacement.value.bedHeightInches} in` : '')
      : ''
  ))

  function getPendingPlacementToolbarMetrics() {
    if (!pendingPlacement.value) {
      return null
    }

    const toolbarWidth = isMobileCaptureMode.value ? 248 : 286
    const toolbarHeight = isMobileCaptureMode.value ? 112 : 76
    const edgePadding = 12
    const offset = 18
    const footprint = getBedFootprint(pendingPlacement.value)
    const { zoom, panX, panY } = gardenStore.viewport
    const left = panX + feetToPixels(pendingPlacement.value.xFeet) * zoom
    const top = panY + feetToPixels(pendingPlacement.value.yFeet) * zoom
    const width = feetToPixels(footprint.widthFeet) * zoom
    const height = feetToPixels(footprint.heightFeet) * zoom
    const screenWidth = $q.screen.width
    const screenHeight = $q.screen.height
    const shouldFlipLeft = left + width + offset + toolbarWidth > screenWidth - edgePadding
    const unclampedLeft = shouldFlipLeft
      ? left - toolbarWidth - offset
      : left + width + offset
    const unclampedTop = top + (height / 2) - (toolbarHeight / 2)

    return {
      width: toolbarWidth,
      height: toolbarHeight,
      left: clamp(unclampedLeft, edgePadding, Math.max(screenWidth - toolbarWidth - edgePadding, edgePadding)),
      top: clamp(unclampedTop, edgePadding, Math.max(screenHeight - toolbarHeight - edgePadding, edgePadding)),
    }
  }

  const pendingPlacementToolbarStyle = computed(() => {
    const toolbarMetrics = getPendingPlacementToolbarMetrics()

    if (!toolbarMetrics) {
      return {}
    }

    return {
      left: `${toolbarMetrics.left}px`,
      top: `${toolbarMetrics.top}px`,
    }
  })

  function getPlacementCenter(placement) {
    const footprint = getBedFootprint(placement)
    return {
      xFeet: placement.xFeet + (footprint.widthFeet / 2),
      yFeet: placement.yFeet + (footprint.heightFeet / 2),
    }
  }

  function resolveNearestBorderEdge(anchorPosition) {
    const distances = [
      { edge: 'top', distance: Math.abs(anchorPosition.yFeet) },
      { edge: 'bottom', distance: Math.abs(gardenStore.lengthFeet - anchorPosition.yFeet) },
      { edge: 'left', distance: Math.abs(anchorPosition.xFeet) },
      { edge: 'right', distance: Math.abs(gardenStore.widthFeet - anchorPosition.xFeet) },
    ]

    return distances.sort((a, b) => a.distance - b.distance)[0]?.edge ?? 'bottom'
  }

  function constrainBorderPlacement(placement, anchorPosition, forcedBorderEdge = null) {
    const edge = forcedBorderEdge ?? resolveNearestBorderEdge(anchorPosition)
    const widthFeet = Number(placement.widthFeet) || 3
    const heightFeet = Number(placement.heightFeet) || 1
    const horizontalMaxX = Math.max(gardenStore.widthFeet - widthFeet, 0)
    const verticalMaxY = Math.max(gardenStore.lengthFeet - widthFeet, 0)

    if (edge === 'top' || edge === 'bottom') {
      return {
        ...placement,
        borderEdge: edge,
        rotationDegrees: 0,
        xFeet: clamp(anchorPosition.xFeet - (widthFeet / 2), 0, horizontalMaxX),
        yFeet: edge === 'top' ? 0 : Math.max(gardenStore.lengthFeet - heightFeet, 0),
      }
    }

    return {
      ...placement,
      borderEdge: edge,
      rotationDegrees: 90,
      xFeet: edge === 'left' ? 0 : Math.max(gardenStore.widthFeet - heightFeet, 0),
      yFeet: clamp(anchorPosition.yFeet - (widthFeet / 2), 0, verticalMaxY),
    }
  }

  function constrainPendingPlacement(placement, anchorPosition = null, forcedBorderEdge = null) {
    const anchor = anchorPosition ?? getPlacementCenter(placement)

    if (placement.placementMode === 'border') {
      return constrainBorderPlacement(placement, anchor, forcedBorderEdge)
    }

    const footprint = getBedFootprint(placement)
    const maxX = Math.max(gardenStore.widthFeet - footprint.widthFeet, 0)
    const maxY = Math.max(gardenStore.lengthFeet - footprint.heightFeet, 0)

    return {
      ...placement,
      xFeet: clamp(anchor.xFeet - (footprint.widthFeet / 2), 0, maxX),
      yFeet: clamp(anchor.yFeet - (footprint.heightFeet / 2), 0, maxY),
    }
  }

  function getDefaultPendingPlacementPosition(item) {
    if (item.placementMode === 'border') {
      return constrainPendingPlacement({
        ...item,
        type: item.storeType,
        rotationDegrees: 0,
        borderEdge: item.borderEdge ?? 'bottom',
        xFeet: 0,
        yFeet: 0,
      }, {
        xFeet: gardenStore.widthFeet / 2,
        yFeet: gardenStore.lengthFeet,
      })
    }

    const viewportWidth = $q.screen.width * (isMobileCaptureMode.value ? 0.5 : 0.58)
    const viewportHeight = $q.screen.height * 0.56
    const footprint = getBedFootprint({
      widthFeet: item.widthFeet,
      heightFeet: item.heightFeet,
      rotationDegrees: 0,
    })
    const xFeet = pixelsToFeet((viewportWidth - gardenStore.viewport.panX) / gardenStore.viewport.zoom) - (footprint.widthFeet / 2)
    const yFeet = pixelsToFeet((viewportHeight - gardenStore.viewport.panY) / gardenStore.viewport.zoom) - (footprint.heightFeet / 2)

    return {
      xFeet: clamp(xFeet, 0, Math.max(gardenStore.widthFeet - footprint.widthFeet, 0)),
      yFeet: clamp(yFeet, 0, Math.max(gardenStore.lengthFeet - footprint.heightFeet, 0)),
    }
  }

  function startPlacementFromPalette(item) {
    const defaultPosition = getDefaultPendingPlacementPosition(item)
    isPendingPlacementPinned.value = isMobileCaptureMode.value
    isPlacementToolbarHovered.value = false
    pendingPlacement.value = {
      ...item,
      type: item.storeType,
      name: item.label,
      xFeet: defaultPosition.xFeet,
      yFeet: defaultPosition.yFeet,
      rotationDegrees: 0,
      activePresetIndex: 0,
    }
    isCapturePanelOpen.value = false
    activeCanvasTool.value = 'move'
  }

  function isPointerNearPendingPlacementToolbar(clientX, clientY) {
    if (
      isMobileCaptureMode.value
      || !isPendingPlacementToolbarVisible.value
      || clientX === undefined
      || clientY === undefined
    ) {
      return false
    }

    const toolbarMetrics = getPendingPlacementToolbarMetrics()

    if (!toolbarMetrics) {
      return false
    }

    const padding = 20
    return clientX >= toolbarMetrics.left - padding
      && clientX <= toolbarMetrics.left + toolbarMetrics.width + padding
      && clientY >= toolbarMetrics.top - padding
      && clientY <= toolbarMetrics.top + toolbarMetrics.height + padding
  }

  function updatePendingPlacementPosition(payload) {
    const gardenPoint = payload?.gardenPoint ?? payload

    if (
      !pendingPlacement.value
      || !gardenPoint
      || (!isMobileCaptureMode.value && isPendingPlacementPinned.value)
      || (!$q.screen.lt.md && (isPlacementToolbarHovered.value || isPointerNearPendingPlacementToolbar(payload?.clientX, payload?.clientY)))
    ) {
      return
    }

    pendingPlacement.value = constrainPendingPlacement(pendingPlacement.value, gardenPoint)
  }

  function togglePendingPlacementPin(payload = null) {
    if (!pendingPlacement.value || isMobileCaptureMode.value) {
      return
    }

    if (!isPendingPlacementPinned.value) {
      const gardenPoint = payload?.gardenPoint ?? payload

      if (gardenPoint) {
        pendingPlacement.value = constrainPendingPlacement(pendingPlacement.value, gardenPoint)
      }
    }

    isPendingPlacementPinned.value = !isPendingPlacementPinned.value
  }

  function placePendingPlacement(buildCaptureZoneName) {
    if (!pendingPlacement.value) {
      return null
    }

    const nextBed = addArea(pendingPlacement.value.storeType, {
      useExactPlacement: true,
      widthFeet: pendingPlacement.value.widthFeet,
      heightFeet: pendingPlacement.value.heightFeet,
      bedHeightInches: pendingPlacement.value.bedHeightInches,
      xFeet: pendingPlacement.value.xFeet,
      yFeet: pendingPlacement.value.yFeet,
      rotationDegrees: pendingPlacement.value.rotationDegrees,
      renderKind: pendingPlacement.value.renderKind ?? null,
      renderTheme: pendingPlacement.value.renderTheme ?? null,
      placementMode: pendingPlacement.value.placementMode ?? null,
      borderEdge: pendingPlacement.value.borderEdge ?? null,
    })

    if (!nextBed) {
      return null
    }

    if (pendingPlacement.value.namePrefix) {
      gardenStore.updateBed(nextBed.id, {
        name: buildCaptureZoneName(pendingPlacement.value, nextBed),
      })
    }

    isPendingPlacementPinned.value = false
    pendingPlacement.value = null
    return nextBed
  }

  function clearPendingPlacement() {
    isPendingPlacementPinned.value = false
    isPlacementToolbarHovered.value = false
    pendingPlacement.value = null
  }

  function cancelPendingPlacement() {
    clearPendingPlacement()
    activeCanvasTool.value = 'move'
  }

  function rotatePendingPlacement() {
    if (!pendingPlacement.value) {
      return
    }

    const currentFootprint = getBedFootprint(pendingPlacement.value)
    const centerX = pendingPlacement.value.xFeet + (currentFootprint.widthFeet / 2)
    const centerY = pendingPlacement.value.yFeet + (currentFootprint.heightFeet / 2)
    pendingPlacement.value = constrainPendingPlacement({
      ...pendingPlacement.value,
      rotationDegrees: ((pendingPlacement.value.rotationDegrees ?? 0) + 90) % 360,
    }, { xFeet: centerX, yFeet: centerY }, getNextBorderEdge(pendingPlacement.value.borderEdge))
  }

  function cyclePendingPlacementSize() {
    if (!pendingPlacement.value || !pendingPlacementTemplate.value?.sizePresets?.length) {
      return
    }

    const currentIndex = Number(pendingPlacement.value.activePresetIndex) || 0
    const nextIndex = (currentIndex + 1) % pendingPlacementTemplate.value.sizePresets.length
    const nextPreset = pendingPlacementTemplate.value.sizePresets[nextIndex]
    const currentFootprint = getBedFootprint(pendingPlacement.value)
    const centerX = pendingPlacement.value.xFeet + (currentFootprint.widthFeet / 2)
    const centerY = pendingPlacement.value.yFeet + (currentFootprint.heightFeet / 2)
    const nextPlacement = {
      ...pendingPlacement.value,
      widthFeet: nextPreset.widthFeet,
      heightFeet: nextPreset.heightFeet,
      activePresetIndex: nextIndex,
    }
    pendingPlacement.value = constrainPendingPlacement(nextPlacement, { xFeet: centerX, yFeet: centerY })
  }

  return {
    pendingPlacement,
    isPendingPlacementPinned,
    isPlacementToolbarHovered,
    isPendingPlacementToolbarVisible,
    pendingPlacementSizeLabel,
    pendingPlacementToolbarStyle,
    startPlacementFromPalette,
    updatePendingPlacementPosition,
    togglePendingPlacementPin,
    placePendingPlacement,
    clearPendingPlacement,
    cancelPendingPlacement,
    rotatePendingPlacement,
    cyclePendingPlacementSize,
  }
}
