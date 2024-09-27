<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia';
import { changeDeviceName } from '../endpoints/devices/ChangeDeviceName.vue';
import { changeDeviceAddress } from '../endpoints/devices/ChangeDeviceAddress.vue';
import { blinkDevice } from '../endpoints/devices/BlinkDevice.vue';
import { useDevicesStore } from '@/stores/devices';
import { useStatesStore } from '@/stores/states';

const devices = useDevicesStore()
const states = useStatesStore()
const { address, network, devicesList} = storeToRefs(devices)

// UI states
const renaming = ref(false)
const changingAddresses = ref(false)

const devicesLoaded = ref(false)

/**
 * Rename all the devices in the devicesList with : networkName + deviceType + deviceNumber.
 * deviceType is : R for router, S for switch, AP for access point, O for other. The deviceType is determined by the second character of the serial number.
 *  - 2: R, 3: AP, 4: S, anything else: O
 * deviceNumber increments for each device of the same type (starting at 1)
 *
 */
const renameDevices = () => {
    let routerCount = 1;
    let switchCount = 1;
    let apCount = 1;
    let otherCount = 1;

    console.log('[NAMING] devicesList: ', devicesList.value)

    for (const device of devicesList.value) {
        console.log('[NAMING] device: ', device)
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

        device.name = newName;

        changeDeviceName(device.serial, newName); // do not wait for the response, just rename them in the background
    }

    // patch the devices store
    devices.$patch({devicesList: devicesList.value})

    // rename the devices
}

/**
 * Change the address of all the devices in the devicesList to the network address
 */

const changeAddresses = async() => {
    changingAddresses.value = true;
    for (const device of devicesList.value) {
        await changeDeviceAddress(device.serial, address.value);
    }
    changingAddresses.value = false;
}

const changeNames = async() => {
    renaming.value = true;
    for (const device of devicesList.value) {
        await changeDeviceName(device.serial, device.name);
    }
    renaming.value = false;
}

const blink = (serial) => {
    blinkDevice(serial);
}

const setup = async() => {
    renameDevices();
    changeAddresses();
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
                <label class="margin-padding-all-normal">{{device.serial}}</label>
                <input class="margin-padding-all-normal" v-model="device.name" type="text" />
                <button class="margin-padding-all-normal" @click="blink(device.serial)">Blink</button>
            </div>
            <div class="make-column">
                <button class="margin-padding-all-normal fit-width" @click="changeNames">Rename Devices</button>
                <p class="margin-padding-all-normal" v-if="renaming">Renaming devices...</p>
                <div class="make-row">
                    <label class="margin-padding-all-normal">Network Address:</label>
                    <input class="margin-padding-all-normal" v-model="address" type="text" placeholder="Network Address"/>
                </div>
                <button class="margin-padding-all-normal fit-width" @click="changeAddresses">Change Addresses</button>
                <p class="margin-padding-all-normal" v-if="changingAddresses">Changing addresses...</p>
                <button class="margin-padding-all-normal fit-width" @click="validate">Next</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .make-column {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .make-row {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .margin-padding-all-normal {
        margin: 10px;
        padding: 10px;
    }

    .fit-width {
        width: fit-content;
    }
</style>
