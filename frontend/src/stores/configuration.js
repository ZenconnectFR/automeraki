import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigurationStore = defineStore('configuration', () => {
    const configuration = ref(null); // full config
    const currentPageConfig = ref(null); // current page config data
    const currentPageIndex = ref(0); // current page index in configuration.actions
    const setConfiguration = (config) => configuration.value = config;
    const setCurrentPageConfig = (config) => currentPageConfig.value = config;
    const setCurrentPageIndex = (page) => currentPageIndex.value = page;

    const nextPage = () => {
        setCurrentPageIndex(currentPageIndex.value + 1);
        console.log('[configStore] nextPage', currentPageIndex.value, ' with data:', configuration.value.actions[currentPageIndex.value].data);
        setCurrentPageConfig(configuration.value.actions[currentPageIndex.value].data);
        return configuration.value.actions[currentPageIndex.value].type;
    }

    const prevPage = () => {
        setCurrentPageIndex(currentPageIndex.value - 1);
        setCurrentPageConfig(configuration.value.actions[currentPageIndex.value].data);
        return configuration.value.actions[currentPageIndex.value].type;
    }

    return {
        configuration,
        currentPageConfig,
        currentPageIndex,
        setConfiguration,
        setCurrentPageConfig,
        setCurrentPageIndex,
        nextPage,
        prevPage
    }
},
    { persist: true }
);
