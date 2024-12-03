import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core';

export const useIdsStore = defineStore('ids', () => {
    const orgId = useStorage('orgId', '');
    const networkId = useStorage('networkId', '');
    const newNetworkId = useStorage('newNetworkId', '');

    const setNewNetworkId = (id: string) => newNetworkId.value = id;
    const setOrgId = (id: string) => orgId.value = id;
    const setNetworkId = (id: string) => networkId.value = id;

    return {
        orgId,
        networkId,
        newNetworkId,
        setNewNetworkId,
        setOrgId,
        setNetworkId
    }
}
)
