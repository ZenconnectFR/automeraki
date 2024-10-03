<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia';
import { changeDeviceName } from '@/endpoints/devices/ChangeDeviceName';
import { changeDeviceAddress } from '@/endpoints/devices/ChangeDeviceAddress';
import { blinkDevice } from '@/endpoints/devices/BlinkDevice';
import { updateTags } from '@/endpoints/devices/UpdateTags';

import { useDevicesStore } from '@/stores/devices';
import { useConfigurationStore } from '@/stores/configuration';

import { useBoolStates } from '@/utils/Decorators';

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const devices = useDevicesStore()
const { address, network, devicesList} = storeToRefs(devices)
const configStore = useConfigurationStore()

const { configuration } = storeToRefs(configStore)

const routers = ref([])
const switches = ref([])
const aps = ref([])
const others = ref([])

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
    console.log('[NAMING] devicesList: ', devicesList.value)

    for (const device of devicesList.value) {
        console.log('[NAMING] device: ', device)
        device["type"] = 'O';
        // model types : MX.+ for router, MS.+ for switch, MR.+ for access point
        // Turn MXs into Rs, MSs into Ss, MRs into APs
        switch(device.model.substring(0, 2)) {
            case 'MX':
                device["type"] = "R";
                routers.value.push(device);
                break;
            case 'MS':
                device["type"] = "S";
                switches.value.push(device);
                break;
            case 'MR':
                device["type"] = "AP";
                aps.value.push(device);
                break;
            default:
                others.value.push(device);
                break;
        }

        let newName = `${network.value}${configuration.value.nameSeparator}`;
        device["networkName"] = newName;
    }
}

const autoUpdateTags = () => {
    // remove any existing tags
    for (const device of devicesList.value) {
        device.tags = [];
    }

    for (const tag of configuration.value.tags) {
        for (const device of devicesList.value) {
            if (tag.devices.includes(device.shortName)) {
                device.tags.push(tag.name);
            }
        }
    }
}

const changeAddresses = useBoolStates([changingAddresses],[], async() => {
    for (const device of devicesList.value) {
        await changeDeviceAddress(device.serial, address.value);
    }
});

const updateNames = (src: any[]) => {
    let index = 1;
    for (const device of src) {
        let newName = `${device.networkName}${device.type}${index}`;
        let shortName = `${device.type}${index}`;
        devicesList.value.find((d: { serial: string; }) => d.serial === device.serial).name = newName;
        devicesList.value.find((d: { serial: string; }) => d.serial === device.serial).shortName = shortName;
        index++;
    }
}

const changeNames = useBoolStates([renaming],[], async() => {
    updateNames(routers.value);
    updateNames(switches.value);
    updateNames(aps.value);

    for (const device of devicesList.value) {
        await changeDeviceName(device.serial, device.name);
    }

    console.log('[NAMING] devicesList after renaming: ', devicesList.value);
}, namesSaved);

const moveUp = (index: number, devices: any[]) => {
    devices.splice(index - 1, 0, devices.splice(index, 1)[0]);
}

const moveDown = (index: number, devices: any[]) => {
    devices.splice(index + 1, 0, devices.splice(index, 1)[0]);
}

const blink = (serial: string) => {
    blinkDevice(serial);
}

const goBack = () => {
    router.push('/claim');
}

const setup = async() => {
    renameDevices();

    devicesLoaded.value = true;
}

const validate = async () => {

    updateNames(routers.value);
    updateNames(switches.value);
    updateNames(aps.value);

    autoUpdateTags();

    console.log('[NAMING] devicesList after renaming: ', devicesList.value);

    for (const device of devicesList.value) {
        let response = await updateTags(device.serial, device.tags);
        console.log('[NAMING] Updated tags for device: ', device.serial, ' response: ', response);
    }

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
            <hr />
            <div v-for="(router, index) in routers" :key="index">
                <div class="make-row">
                    <p>{{ router.serial }}</p>
                    <input v-model="router.networkName" type="text" placeholder="Name"/>
                    <p>{{ `${router.type}${index+1}` }}</p>
                    <button :disabled="index===0" @click="moveUp(index, routers)">Up</button>
                    <button :disabled="index===(routers.length-1)" @click="moveDown(index, routers)">Down</button>
                    <button @click="blink(router.serial)">Blink</button>
                </div>
            </div>
            <hr />
            <div v-for="(switchDevice, index) in switches" :key="index">
                <div class="make-row">
                    <p>{{ switchDevice.serial }}</p>
                    <input v-model="switchDevice.networkName" type="text" placeholder="Name"/>
                    <p>{{ `${switchDevice.type}${index+1}` }}</p>
                    <button :disabled="index===0" @click="moveUp(index, switches)">Up</button>
                    <button :disabled="index===(switches.length-1)" @click="moveDown(index, switches)">Down</button>
                    <button @click="blink(switchDevice.serial)">Blink</button>
                </div>
            </div>
            <hr />
            <div v-for="(ap, index) in aps" :key="index">
                <div class="make-row">
                    <p>{{ ap.serial }}</p>
                    <input v-model="ap.networkName" type="text" placeholder="Name"/>
                    <p>{{ `${ap.type}${index+1}` }}</p>
                    <button :disabled="index===0" @click="moveUp(index, aps)">Up</button>
                    <button :disabled="index===(aps.length-1)" @click="moveDown(index, aps)">Down</button>
                    <button @click="blink(ap.serial)">Blink</button>
                </div>
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
