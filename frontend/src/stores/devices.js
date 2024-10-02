import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDevicesStore = defineStore('devices', () => {
    /**
     * Devices : {all the info about the devices (fetch from the backend)}
     */
    const devicesList = ref([]);
    // address : str
    const address = ref('');
    // network : str
    const network = ref('');
    // vlans : [int]
    const vlans = ref([]);

    const setDevicesList = (list) => devicesList.value = list;
    const addDevice = (device) => devicesList.value.push(device);
    const addDevices = (devices) => devicesList.value.push(...devices);
    const setAddress = (addr) => address.value = addr;
    const setNetwork = (net) => network.value = net;
    const setVlans = (v) => vlans.value = v;
    const addVlan = (v) => vlans.value.push(v);

    return {
        devicesList,
        address,
        network,
        vlans,
        setDevicesList,
        addDevice,
        addDevices,
        setAddress,
        setNetwork,
        setVlans,
        addVlan
    }
});
