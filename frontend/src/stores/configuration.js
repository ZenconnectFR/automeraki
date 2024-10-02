import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigurationStore = defineStore('configuration', () => {
    const configuration = ref(null);
    const setConfiguration = (config) => configuration.value = config;

    return {
        configuration,
        setConfiguration
    }
});
