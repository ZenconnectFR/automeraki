<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia';
import { changeDeviceName } from '../Endpoints/Devices/ChangeDeviceName.vue';
import { changeDeviceAddress } from '../Endpoints/Devices/ChangeDeviceAddress.vue';
import { useDevicesStore } from '@/Stores/devices';
import { useStatesStore } from '@/Stores/states';

const devices = useDevicesStore()
const states = useStatesStore()
const { address, network, devicesList} = storeToRefs(devices) // !! devicesList will be empty by default, this page will start by automatically naming devices and then allow the user to change them

const devicesLoaded = ref(false)

/**
 * Rename all the devices in the devicesList with : networkName + deviceType + deviceNumber.
 * deviceType is : R for router, S for switch, AP for access point, O for other. The deviceType is determined by the second character of the serial number.
 *  - 2: R, 3: AP, 4: S, anything else: O
 * deviceNumber increments for each device of the same type (starting at 1)
 *
 */
const renameDevices = async() => {
    let routerCount = 1;
    let switchCount = 1;
    let apCount = 1;
    let otherCount = 1;

    console.log(devicesList);

    for (const device of devicesList.value) {
        let deviceType = 'O';
        switch(device.serial[1]) {
            case '2':
                deviceType = 'R';
                break;
            case '3':
                deviceType = 'AP';
                break;
            case '4':
                deviceType = 'S';
                break;
            default:
                deviceType = 'O';
        }

        let newName = network.value + ' ' + deviceType +
            (deviceType === 'R' ? routerCount++ : deviceType === 'S' ? switchCount++ : deviceType === 'AP' ? apCount++ : otherCount++);

        await changeDeviceName(device.serial, newName);

        device.name = newName;
    }

    // patch the devices store
    devices.$patch({devicesList: devicesList.value})
}

/**
 * Change the address of all the devices in the devicesList to the network address
 */

const changeAddresses = async() => {
    for (const device of devicesList.value) {
        await changeDeviceAddress(device.serial, address.value);
    }
}

const setup = async() => {
    await renameDevices();
    await changeAddresses();
    devicesLoaded.value = true;
}

const validate = () => {
    // set the namingDone state to true
    states.$patch({namingDone: true})
}

onMounted(() => {
    setup();
});
</script>


<template>
    <div id="naming page">
        <h1>Names</h1>
        <p>Names for devices have been auto-generated, you can change them if required</p>
        <div v-if="devicesLoaded" id="naming-form">
            <!-- display all devices in deviceList-->
            <div v-for="device in devicesList" :key="device.serial">
                <label>{{device.serial}}</label>
                <input v-model="device.name" type="text" />
            </div>
            <button @click="renameDevices">Rename Devices</button>
            <button @click="validate">Next</button>
        </div>
    </div>
</template>

<style scoped>
</style>
