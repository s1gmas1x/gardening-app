export const captureGroups = [
  { value: 'planting_areas', label: 'Planting Areas', icon: 'eco' },
  { value: 'structures', label: 'Structures', icon: 'home_work' },
  { value: 'landmarks', label: 'Landmarks', icon: 'place' },
]

export const captureItems = [
  { value: 'raised', label: 'Raised Bed', icon: 'view_in_ar', group: 'planting_areas', storeType: 'raised', renderTheme: 'planting', widthFeet: 4, heightFeet: 8, bedHeightInches: 18, namePrefix: null, sizePresets: [{ widthFeet: 4, heightFeet: 8 }, { widthFeet: 3, heightFeet: 6 }, { widthFeet: 2, heightFeet: 4 }] },
  { value: 'regular', label: 'In-Ground Bed', icon: 'crop_square', group: 'planting_areas', storeType: 'regular', renderTheme: 'planting', widthFeet: 4, heightFeet: 8, bedHeightInches: 0, namePrefix: null, sizePresets: [{ widthFeet: 4, heightFeet: 8 }, { widthFeet: 3, heightFeet: 6 }, { widthFeet: 2, heightFeet: 4 }] },
  { value: 'pot', label: 'Pot', icon: 'radio_button_unchecked', group: 'planting_areas', storeType: 'pot', renderTheme: 'planting', widthFeet: 2, heightFeet: 2, bedHeightInches: 16, namePrefix: null, sizePresets: [{ widthFeet: 2, heightFeet: 2 }, { widthFeet: 3, heightFeet: 3 }] },
  { value: 'greenhouse', label: 'Greenhouse', icon: 'home_work', group: 'structures', storeType: 'regular', renderTheme: 'structure', widthFeet: 8, heightFeet: 10, bedHeightInches: 0, namePrefix: 'Greenhouse', sizePresets: [{ widthFeet: 8, heightFeet: 10 }, { widthFeet: 10, heightFeet: 12 }] },
  { value: 'hoophouse', label: 'Hoophouse', icon: 'roofing', group: 'structures', storeType: 'regular', renderTheme: 'structure', widthFeet: 10, heightFeet: 14, bedHeightInches: 0, namePrefix: 'Hoophouse', sizePresets: [{ widthFeet: 10, heightFeet: 14 }, { widthFeet: 8, heightFeet: 12 }] },
  { value: 'entrance', label: 'Entrance', icon: 'login', group: 'landmarks', storeType: 'regular', renderTheme: 'landmark', widthFeet: 3, heightFeet: 1, bedHeightInches: 0, namePrefix: 'Entrance', renderKind: 'entrance', placementMode: 'border', borderEdge: 'bottom', sizePresets: [{ widthFeet: 3, heightFeet: 1 }, { widthFeet: 4, heightFeet: 1 }] },
  { value: 'fence', label: 'Fence / Wall', icon: 'fence', group: 'landmarks', storeType: 'regular', renderTheme: 'landmark', widthFeet: 12, heightFeet: 1, bedHeightInches: 0, namePrefix: 'Fence', renderKind: 'line', sizePresets: [{ widthFeet: 8, heightFeet: 1 }, { widthFeet: 12, heightFeet: 1 }, { widthFeet: 16, heightFeet: 1 }] },
]
