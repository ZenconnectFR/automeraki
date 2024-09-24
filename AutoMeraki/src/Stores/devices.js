import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDevicesStore = defineStore('devices', () => {
    const devicesList = ref([]); // array of devices: { serial : str, name : str}
    const address = ref('');
    const network = ref('');

    return {
        devicesList,
        address,
        network
    }
});
