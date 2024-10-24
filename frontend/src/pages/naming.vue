<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia';
import { changeDeviceName } from '@/endpoints/devices/ChangeDeviceName';
import { changeDeviceAddress } from '@/endpoints/devices/ChangeDeviceAddress';
import { blinkDevice } from '@/endpoints/devices/BlinkDevice';
import { updateTags } from '@/endpoints/devices/UpdateTags';

import { getRoutePath } from '@/utils/PageRouter'

import { useDevicesStore } from '@/stores/devices';
import { useConfigurationStore } from '@/stores/configuration';

import { useBoolStates } from '@/utils/Decorators';

import { useRouter, useRoute } from 'vue-router'
import { get } from '@vueuse/core';

const router = useRouter()
const route = useRoute()

const devices = useDevicesStore()
const { network, devicesList} = storeToRefs(devices)
const configStore = useConfigurationStore()

const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value;

// UI states
const renaming = ref(false)
const namesSaved = ref(false)

const devicesLoaded = ref(false)

const routers = ref([])
const switches = ref([])
const aps = ref([])
const others = ref([])

const routersTable = ref([])
const switchesTable = ref([])
const apsTable = ref([])
const othersTable = ref([])


const typeFinder = (model: string) => {
    if (model.includes('MX')) {
        return 'router'
    } else if (model.includes('MS')) {
        return 'switch'
    } else if (model.includes('MR')) {
        return 'ap'
    } else {
        return 'other'
    }
}

const buildTables = (associationTable: any[]) => {
    for (const association of associationTable) {
        if (association.type === 'router') {
            routersTable.value.push(association)
        } else if (association.type === 'switch') {
            switchesTable.value.push(association)
        } else if (association.type === 'ap') {
            apsTable.value.push(association)
        } else {
            othersTable.value.push(association)
        }
    }

    // sort tables by the id field (string sorting)
    routersTable.value.sort((a, b) => a.id.localeCompare(b.id))
    switchesTable.value.sort((a, b) => a.id.localeCompare(b.id))
    apsTable.value.sort((a, b) => a.id.localeCompare(b.id))

    // add a used field to each association
    for (const association of routersTable.value) {
        association.used = false;
    }
    for (const association of switchesTable.value) {
        association.used = false;
    }
    for (const association of apsTable.value) {
        association.used = false;
    }
    for (const association of othersTable.value) {
        association.used = false;
    }

    // sort each table by the id field
    routersTable.value.sort((a, b) => a.id.localeCompare(b.id))
    switchesTable.value.sort((a, b) => a.id.localeCompare(b.id))
    apsTable.value.sort((a, b) => a.id.localeCompare(b.id))
    othersTable.value.sort((a, b) => a.id.localeCompare(b.id))

    console.log('[NAMING] routersTable: ', routersTable.value)
    console.log('[NAMING] switchesTable: ', switchesTable.value)
    console.log('[NAMING] apsTable: ', apsTable.value)
}

/**
 * Rename devices according to the format string contained in config.name
 * The string will always have the following variable between curly braces: {associationName} which is required to give to a unique id to the device
 * The string can also contain the following variables between curly braces: {networkName}
 */
const renameDevices = () => {
    console.log('[NAMING] devicesList: ', devicesList.value);
    // few checks to ensure that the config is correct
    if (devicesList.value.length === 0 || config.associationTable.length === 0
        || devicesList.value.length !== config.associationTable.length) {
            console.error('Error renaming devices: devicesList or associationTable is empty or have different lengths');
            console.log('[NAMING] devicesList: ', devicesList.value);
            console.log('[NAMING] associationTable: ', config.associationTable);
            return;
    }

    if (devicesList.value.some((device: { associationId: string; }) => device.associationId)) {
        // if there are already devices with an associationId, then we are configuring an existing network
        // we need to add all the devices to the corresponding array and move them to the same index as their associationId in the respective table
        for (const device of devicesList.value) {
            if (device.type === 'router') {
                routers.value.push(device);
            } else if (device.type === 'switch') {
                switches.value.push(device);
            } else if (device.type === 'ap') {
                aps.value.push(device);
            } else {
                others.value.push(device);
            }
        }

        // sort the devices by associationId[associationId.length - 1]
        routers.value.sort((a, b) => a.associationId[a.associationId.length - 1] - b.associationId[b.associationId.length - 1]);
        switches.value.sort((a, b) => a.associationId[a.associationId.length - 1] - b.associationId[b.associationId.length - 1]);
        aps.value.sort((a, b) => a.associationId[a.associationId.length - 1] - b.associationId[b.associationId.length - 1]);
        others.value.sort((a, b) => a.associationId[a.associationId.length - 1] - b.associationId[b.associationId.length - 1]);

        // since the devices are already named, we can return
        return;
        
    }

    for (const device of devicesList.value) {
        // assign a type to the device
        device.type = typeFinder(device.model);
        
        // depending on the type, find the first unused association in the corresponding table
        let association: { used: boolean; id: any; name: any; type: any; } | undefined;
        if (device.type === 'router') {
            association = routersTable.value.find((a) => a.type === 'router' && !a.used);
            routers.value.push(device);
        } else if (device.type === 'switch') {
            association = switchesTable.value.find((a) => a.type === 'switch' && !a.used);
            switches.value.push(device);
        } else if (device.type === 'ap') {
            association = apsTable.value.find((a) => a.type === 'ap' && !a.used);
            aps.value.push(device);
        } else {
            association = others.value.find((a) => !a.used);
            others.value.push(device);
        }

        // if no association is found, log an error and return
        if (!association) {
            console.error('Error renaming devices: no association found for device ', device);
            return;
        }

        // mark the association as used
        association.used = true;

        console.log('[NAMING] after marking association as used: ', routersTable.value, switchesTable.value, apsTable.value, others.value);

        // assign the association id to the device
        device.associationId = association.id;

        // also assign the association type to the device
        device.type = association.type;

        // finally, change the name of the device according to the format string
        device.name = config.name.replace('{networkName}', network.value).replace('{associationName}', '');
    }

}

const clearDeviceTags = (devices : any[]) => {
    for (const device of devices) {
        device.tags = [];
    }
}

const autoUpdateTags = async () => {
    // TODO
    console.log('[NAMING] autoUpdateTags');

    /**
     * For each tag in config.tags, we need to find the corresponding devices in the devicesList and update their tags
     * if tag.useLimit is true, we need to limit the number of devices that can have this tag: 
     *   We sort the array that correspongs to the type of tag.limit.targetType in tag.limit.order ('asc' or 'desc')
     *   We add the tag to the first tag.limit.number devices in the array
     * else we add the tag to all devices in tag.equipement that we find in the devicesList
     */

    // clear all tags
    [routers, switches, aps, others].forEach((devices) => {
        clearDeviceTags(devices.value);
    });

    function getDeviceByType(targetType: string) {
        switch (targetType) {
            case 'router':
                return routers.value;
            case 'switch':
                return switches.value
            case 'ap':
                return aps.value;
            default:
                return others.value;
        }
    }

    config.tags.forEach((tag: { useLimit: any; equipments: any; name: any; limit: any | null; }) => {
        const { useLimit, equipments, name, limit } = tag;

        function getMatchingDevices(devices: any[]): any[] {
            return devices.filter((device) => equipments.includes(device.associationId));
        }

        if (useLimit) {
            console.log('[NAMING] tag with limit: ', tag);
            const { targetType, order, number } = limit;
            const devicesTyped = getDeviceByType(targetType);
            let matchingDevices = getMatchingDevices(devicesTyped);

            console.log('[NAMING] matchingDevices: ', matchingDevices);

            matchingDevices.sort((a, b) => {
                if (order === 'asc') {
                    return a.associationId.localeCompare(b.associationId);
                } else {
                    return b.associationId.localeCompare(a.associationId);
                }
            });

            matchingDevices.slice(0, number).forEach((device) => {
                device.tags.push(name);
            });
        } else {
            console.log('[NAMING] tag without limit: ', tag);
            [routers, switches, aps, others].forEach((devices) => {
                getMatchingDevices(devices.value).forEach((device) => {
                    device.tags.push(name);
                });
            });
        }
    });    
}

const updateNames = (src: any[], table: any[]) => {
    let index = 0;
    for (const device of src) {
        // update the name of the device: config.name with the association name taken from the table at the same index
        device.name = config.name.replace('{networkName}', network.value).replace('{associationName}', table[index].name);
        index++;
        console.log('[NAMING] updated name: ', device.name, 'for device serial: ', device.serial, 'with associationId: ', device.associationId);
    }
}

const changeNames = useBoolStates([renaming],[], async() => {
    updateNames(routers.value, routersTable.value);
    updateNames(switches.value, switchesTable.value);
    updateNames(aps.value, apsTable.value);

    for (const device of devicesList.value) {
        await changeDeviceName(device.serial, device.name);
    }

    for (const device of devicesList.value) {
        await updateTags(device.serial, device.tags);
    }

}, namesSaved);

const moveUp = (index: number, devices: any[]) => {
    // swap the device at index with the device at index - 1
    devices.splice(index - 1, 0, devices.splice(index, 1)[0]);

    // update the association id and name of the devices
    let temp = devices[index].associationId;
    devices[index].associationId = devices[index - 1].associationId;
    devices[index - 1].associationId = temp;

    temp = devices[index].name;
    devices[index].name = devices[index - 1].name;
    devices[index - 1].name = temp;
}

const moveDown = (index: number, devices: any[]) => {
    // swap the device at index with the device at index + 1
    devices.splice(index + 1, 0, devices.splice(index, 1)[0]);

    // update the association id and name of the devices
    let temp = devices[index].associationId;
    devices[index].associationId = devices[index + 1].associationId;
    devices[index + 1].associationId = temp;

    temp = devices[index].name;
    devices[index].name = devices[index + 1].name;
    devices[index + 1].name = temp;
}

const blink = (serial: string) => {
    blinkDevice(serial);
}

const goBack = () => {
    router.push('/claim');
}

const setup = async() => {

    console.log('[NAMING] config: ', config);
    buildTables(config.associationTable);

    renameDevices();
    console.log('[NAMING] devicesList after renaming: ', devicesList.value);
    console.log('[NAMING] device lists: ', routers.value, switches.value, aps.value, others.value);

    autoUpdateTags();

    devicesLoaded.value = true;
}

const validate = async () => {
    console.log('[NAMING] devicesList after full renaming: ', devicesList.value);    

    // save deviceList to the store
    devices.setDevicesList(devicesList.value);

    console.log('[NAMING] current page config: ', currentPageConfig.value);

    // go to the next page
    router.push(getRoutePath(configStore.nextPage()));
}

onMounted(() => {
    setup();
});
</script>


<template>
    <div id="naming page">
        <h1>Names</h1>
        <div v-if="devicesLoaded" id="naming-form" class="make-column">
            <div class="make-column">
                <div class="make-row">
                    <h2>Routers</h2>
                </div>
                <div v-for="(router, index) in routers" :key="index" class="make-row">
                    <p class="margin-padding">{{ router.serial }}</p>
                    <input class="margin-padding" v-model="router.name"/>
                    <input class="margin-padding" v-model="routersTable[index].name"/>
                    <p class="margin-padding">id : {{ routersTable[index].id }}</p>
                    <button class="margin-padding" :disabled="index===0" @click="moveUp(index, routers)">Up</button>
                    <button class="margin-padding" :disabled="index===routers.length-1" @click="moveDown(index, routers)">Down</button>
                    <button class="margin-padding" @click="blink(router.serial)">Blink</button>
                </div>
            </div>
            <div class="make-column">
                <div class="make-row">
                    <h2>Switches</h2>
                </div>
                <div v-for="(switchDevice, index) in switches" :key="index" class="make-row">
                    <p class="margin-padding">{{ switchDevice.serial }}</p>
                    <input class="margin-padding" v-model="switchDevice.name"/>
                    <input class="margin-padding" v-model="switchesTable[index].name"/>
                    <p class="margin-padding">id: {{ switchesTable[index].id }}</p>
                    <button class="margin-padding" :disabled="index===0" @click="moveUp(index, switches)">Up</button>
                    <button class="margin-padding" :disabled="index===switches.length-1" @click="moveDown(index, switches)">Down</button>
                    <button class="margin-padding" @click="blink(switchDevice.serial)">Blink</button>
                </div>
            </div>
            <div class="make-column">
                <div class="make-row">
                    <h2>Access Points</h2>
                </div>
                <div v-for="(ap, index) in aps" :key="index" class="make-row">
                    <p class="margin-padding">{{ ap.serial }}</p>
                    <input class="margin-padding" v-model="ap.name"/>
                    <input class="margin-padding" v-model="apsTable[index].name"/>
                    <p class="margin-padding">id: {{ apsTable[index].id }}</p>
                    <button class="margin-padding" :disabled="index===0" @click="moveUp(index, aps)">Up</button>
                    <button class="margin-padding" :disabled="index===aps.length-1" @click="moveDown(index, aps)">Down</button>
                    <button class="margin-padding" @click="blink(ap.serial)">Blink</button>
                </div>
            </div>
            <hr />
            <hr />
            <hr />
            <div>
                <h2>Tagging</h2>
                <!-- For each device, show its list of tags, and allow the user edit them -->
                <div class="make-row" v-for="(device, index) in devicesList" :key="index">
                    <div class="make-row" v-if="device.tags.length > 0">
                        <p class="margin-padding">{{ device.associationId }}</p>
                        <div v-for="(tag, tagIndex) in device.tags" :key="tagIndex" class="make-row">
                            <input class="margin-padding" v-model="device.tags[tagIndex]"/>
                            <button class="margin-padding" @click="device.tags.splice(tagIndex, 1)">Remove</button>
                        </div>
                        <button class="margin-padding" @click="device.tags.push('')">Add tag</button>
                    </div>
                </div>
            </div>
            <button class="margin-padding" @click="changeNames">Save</button>
            <p v-if="renaming">Renaming devices...</p>
            <div class="make-row margin-padding">
                <button class="margin-padding" @click="goBack">Back</button>
                <button class="margin-padding" @click="validate">Next</button>
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

    .margin-padding {
        margin: 10px;
        padding: 10px;
    }

    .fit-width {
        width: fit-content;
    }
</style>
