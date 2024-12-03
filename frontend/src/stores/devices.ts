import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core';

export const useDevicesStore = defineStore('devices', () => {
    /**
     * Devices : {all the info about the devices (fetch from the backend)}
     */
    const devicesList = useStorage('devicesList', [] as any[]);
    // address : str
    const address = useStorage('address', '');
    // network : str
    const network = useStorage('network', '');
    // vlans : [int]
    const vlans = useStorage('vlans', [] as number[]);

    const setDevicesList = (list: any[]) => devicesList.value = list;
    const addDevice = (device: any) => devicesList.value.push(device);
    const addDevices = (devices: any[]) => devicesList.value.push(...devices);
    const setAddress = (addr: string) => address.value = addr;
    const setNetwork = (net: string) => network.value = net;
    const setVlans = (v: number[]) => vlans.value = v;
    const addVlan = (v: number) => vlans.value.push(v);

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
