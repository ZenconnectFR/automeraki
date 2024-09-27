import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDevicesStore = defineStore('devices', () => {
    const devicesList = ref([]); // array of devices: { serial : str, name : str}
    const address = ref('');
    const network = ref('');

    const setDevicesList = (list) => devicesList.value = list;
    const setAddress = (addr) => address.value = addr;
    const setNetwork = (net) => network.value = net;

    return {
        devicesList,
        address,
        network,
        setDevicesList,
        setAddress,
        setNetwork
    }
});
