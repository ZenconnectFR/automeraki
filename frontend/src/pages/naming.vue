<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia';
import { changeDeviceName } from '@/endpoints/devices/ChangeDeviceName';
import { changeDeviceAddress } from '@/endpoints/devices/ChangeDeviceAddress';
import { blinkDevice } from '@/endpoints/devices/BlinkDevice';
import { useDevicesStore } from '@/stores/devices';
import { useConfigurationStore } from '@/stores/configuration';

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const devices = useDevicesStore()
const { address, network, devicesList} = storeToRefs(devices)
const configStore = useConfigurationStore()

const { configuration } = storeToRefs(configStore)

// UI states
const renaming = ref(false)
const changingAddresses = ref(false)
const namesSaved = ref(false)

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

        let suffix = deviceType + (deviceType === 'R' ? routerCount++ : deviceType === 'S' ? switchCount++ : deviceType === 'AP' ? apCount++ : otherCount++);

        let newName = `${network.value}${configuration.value.nameSeparator}${suffix}`;

        device.name = newName;
        device['type'] = deviceType;
        device['shortName'] = suffix;
    }

    // patch the devices store
    devices.setDevicesList(devicesList.value);

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
    namesSaved.value = true;
}

const blink = (serial) => {
    blinkDevice(serial);
}

const goBack = () => {
    router.push('/claim');
}

const setup = async() => {
    renameDevices();
    devicesLoaded.value = true;
}

const validate = () => {
    // set the namingDone state to true
    router.push('/fixed-ip');
}

onMounted(() => {
    setup();
});
</script>


<template>
    <div id="naming page">
        <h1>Names</h1>
        <div v-if="devicesLoaded" id="naming-form">
            <p v-if="namesSaved === false">Warning: names have not been saved yet</p>
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
                <div class="make-row">
                    <button class="margin-padding-all-normal fit-width" @click="goBack">back</button>
                    <button class="margin-padding-all-normal fit-width" @click="validate">Next</button>
                </div>
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
