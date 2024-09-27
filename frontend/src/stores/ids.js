import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useIdsStore = defineStore('ids', () => {
    const orgId = ref('');
    const networkId = ref('');
    const newNetworkId = ref('');

    const setNewNetworkId = (id) => newNetworkId.value = id;

    return {
        orgId,
        networkId,
        newNetworkId,
        setNewNetworkId
    }
})
