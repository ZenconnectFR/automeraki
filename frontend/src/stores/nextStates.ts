import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core';


export const useNextStatesStore = defineStore('nextStates', () => {
    const nextStates = useStorage('nextStates', [] as boolean[]);

    const getState = (index: number) => nextStates.value[index];

    const setNextStates = (states: boolean[]) => nextStates.value = states;
    const setAllTrue = () => nextStates.value = nextStates.value.map(() => true);
    const setStateTrue = (index: number) => nextStates.value[index] = true;
    const initStates = (n: number) => nextStates.value = Array(n).fill(false);

    return {
        nextStates,
        getState,
        setNextStates,
        setAllTrue,
        setStateTrue,
        initStates
    }
});