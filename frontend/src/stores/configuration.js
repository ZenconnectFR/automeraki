import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigurationStore = defineStore('configuration', () => {
    const configuration = ref(null); // full config
    const currentPageConfig = ref(null); // current page config data
    const currentPageIndex = ref(0); // current page index in configuration.actions
    const setConfiguration = (config) => configuration.value = config;
    const setCurrentPageConfig = (config) => currentPageConfig.value = config;
    const setCurrentPageIndex = (page) => currentPageIndex.value = page;

    return {
        configuration,
        currentPageConfig,
        currentPageIndex,
        setConfiguration,
        setCurrentPageConfig,
        setCurrentPageIndex
    }
});
