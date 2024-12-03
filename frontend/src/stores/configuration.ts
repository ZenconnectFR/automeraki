import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core';

export const useConfigurationStore = defineStore('configuration', () => {
    const configuration = useStorage('configuration', {actions: []} as any, localStorage, {mergeDefaults: true}) // full config
    const currentPageConfig = useStorage('currentPageConfig', {type: '', "data": {}} as any, localStorage, {mergeDefaults: true}); // current page config data
    const currentPageIndex = useStorage('currentPageIndex', 0); // current page index in configuration.actions
    const setConfiguration = (config: any) => configuration.value = config;
    const setCurrentPageConfig = (config: any) => currentPageConfig.value = config;
    const setCurrentPageIndex = (page: number) => currentPageIndex.value = page;

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
});
