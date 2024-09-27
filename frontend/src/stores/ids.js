import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useIdsStore = defineStore('ids', () => {
    const orgId = ref('');
    const networkId = ref('');
    const newNetworkId = ref('');

    const setNewNetworkId = (id) => newNetworkId.value = id;
    const setOrgId = (id) => orgId.value = id;
    const setNetworkId = (id) => networkId.value = id;

    return {
        orgId,
        networkId,
        newNetworkId,
        setNewNetworkId,
        setOrgId,
        setNetworkId
    }
})
