import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStatesStore = defineStore('states', () => {
    const setupDone = ref(false);
    const claimDone = ref(false);
    const vlanDone = ref(false);

    return {
        setupDone,
        claimDone,
        vlanDone
    }
});
