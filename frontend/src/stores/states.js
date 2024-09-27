import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStatesStore = defineStore('states', () => {
    const setupDone = ref(false);
    const claimDone = ref(false);
    const namingDone = ref(false);
    const vlanDone = ref(false);

    const setSetupDone = (done) => setupDone.value = done;
    const setClaimDone = (done) => claimDone.value = done;
    const setNamingDone = (done) => namingDone.value = done;
    const setVlanDone = (done) => vlanDone.value = done;

    return {
        setupDone,
        claimDone,
        namingDone,
        vlanDone,
        setSetupDone,
        setClaimDone,
        setNamingDone,
        setVlanDone
    }
});
