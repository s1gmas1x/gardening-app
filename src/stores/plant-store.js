import { defineStore } from 'pinia'
import { buildPlantOption, BUILT_IN_PLANTS, getPlantById } from 'src/utils/garden/plants'

function createDefaultState() {
  return {
    builtInPlants: BUILT_IN_PLANTS,
    customPlants: [],
  }
}

export const usePlantStore = defineStore('plants', {
  state: createDefaultState,

  getters: {
    plantLibrary: (state) => [...state.builtInPlants, ...state.customPlants],
    plantOptions() {
      return this.plantLibrary.map(buildPlantOption)
    },
    defaultPlantId() {
      return this.plantLibrary[0]?.id ?? ''
    },
  },

  actions: {
    getPlantById(plantId) {
      return getPlantById(this.plantLibrary, plantId)
    },
  },
})
