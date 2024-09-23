import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useIdsStore = defineStore('ids', () => {
    const orgId = ref('');
    const networkId = ref('');
    const newNetworkId = ref('');

    return {
        orgId,
        networkId,
        newNetworkId,
    }
})
