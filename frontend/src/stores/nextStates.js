import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNextStatesStore = defineStore('nextStates', () => {
    const nextStates = ref([]);

    const getState = (index) => nextStates.value[index];

    const setNextStates = (states) => nextStates.value = states;
    const setAllTrue = () => nextStates.value = nextStates.value.map(() => true);
    const setStateTrue = (index) => nextStates.value[index] = true;
    const initStates = (n) => nextStates.value = Array(n).fill(false);

    return {
        nextStates,
        getState,
        setNextStates,
        setAllTrue,
        setStateTrue,
        initStates
    }
}, { persist: true }
);