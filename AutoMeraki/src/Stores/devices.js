import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDevicesStore = defineStore('devices', () => {
    const devices = ref([]); // array of devices: { id : str, name : str}
    const selectedDevice = ref(null); // selected device: { id : str, name : str}
    const filteredDevices = ref([]);
    const search = ref('');
    const address = ref('');

    // getters (precomputed properties)

    // filter devices by search
    const filterDevices = (devices, search) => {
        return devices.filter(device => {
            return device.name.toLowerCase().includes(search.toLowerCase());
        });
    }

    // setters (methods that modify the state)

    // Select a device
    const selectDevice = (deviceId, deviceName) => {
        selectedDevice.value = { id: deviceId, name: deviceName };
    }

    // set the devices
    const setDevices = (devicesList) => {
        devices.value = devicesList;
        updateFilteredDevices();
    }

    // actions (methods)

    // Update the filtered devices
    const updateFilteredDevices = () => {
        filteredDevices.value = filterDevices(devices.value, search.value);
    }

    return {
        devices,
        selectedDevice,
        filteredDevices,
        search,
        address,
        selectDevice,
        setDevices,
    }
});
