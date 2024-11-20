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

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Divider from 'primevue/divider';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import MultiSelect from 'primevue/multiselect';
import Popover from 'primevue/popover';

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

const address = ref('')

const editingRows = ref([])

const saveAddressHelpRef = ref()

const toggleSaveAddressHelp = (event) => {
    saveAddressHelpRef.value.toggle(event);
}

const idHelpRef = ref()

const toggleIdHelp = (event) => {
    idHelpRef.value.toggle(event);
}

const onRowEditSaveTags = (event: any, table: any) => {
    console.log('[TAGGING] Row edit saved:', event);
    const { newData, index } = event;
    table[index].tags = newData.tags;
};

const onRowEditSave = (event: any, table: any) => {
    let { data, newData, index } = event;

    console.log('[NAMING] onRowEditSave: ', data, newData, index);

    // can only edit the associationId and associationName, ids are unique so we switch the ids and names if the old id is not the same as the new id
    if (data.associationId !== newData.associationId) {
        console.log('[NAMING] associationId changed: ', data.associationId, newData.associationId);
        // find the device with the new id
        const initiatorDeviceIndex = table.findIndex((device: { associationId: any; }) => device.associationId === data.associationId);
        const edgeAffectedDeviceIndex = table.findIndex((device: { associationId: any; }) => device.associationId === newData.associationId);

        if (edgeAffectedDeviceIndex >= 0) {
            const initiatorDevice = { ...table[initiatorDeviceIndex] };
            const edgeAffectedDevice = { ...table[edgeAffectedDeviceIndex] };

            // switch the ids, names and tags
            [initiatorDevice.associationId, edgeAffectedDevice.associationId] = [edgeAffectedDevice.associationId, initiatorDevice.associationId];
            [initiatorDevice.associationName, edgeAffectedDevice.associationName] = [edgeAffectedDevice.associationName, initiatorDevice.associationName];
            [initiatorDevice.tags, edgeAffectedDevice.tags] = [edgeAffectedDevice.tags, initiatorDevice.tags];

            Object.assign(table[initiatorDeviceIndex], initiatorDevice);
            Object.assign(table[edgeAffectedDeviceIndex], edgeAffectedDevice);

            Object.assign(data, initiatorDevice);
            Object.assign(newData, edgeAffectedDevice);
        }
    } else {
        // else, just update the data
        Object.assign(data, newData);
    }

    // re-order the table by associationId
    table.sort((a: { associationId: string; }, b: { associationId: any; }) => a.associationId.localeCompare(b.associationId));

    editingRows.value = [];
    setTimeout(() => {
        editingRows.value = [...editingRows.value];
    }, 0);

    console.log('[NAMING] table after edit: ', table);
}

// uses config.associationLogic to calculate the associationId
const calculateAssociationId = (associationTable: any[], device: {
    switchPorts: any; type: string
}) : any => {
    // 1. get the list of associations of the type of the device (set of associations from both the devicelist and the associationTable)
    const presentAssociations = devicesList.value.filter((device: { type: any; }) => device.type === device.type).map((device: { associationId: any; }) => device.associationId);
    // add the associations from the associationTable
    for (const association of associationTable) {
        if (association.type === device.type) {
            presentAssociations.push(association.id);
        }
    }
    
    /*2. determine the associationId based on the associationLogic 
    the associationLogic is like:
    "associationLogic": {
        "ap": {
            "commentAboutThis": "variables can be either {number}, {letter} or {alnum}",
            "format": "AP{number}",
            "initialNumber": 1,
            "initialLetter": "A",
            "initialAlnum": "1"
        },
        ...
    */

    let logic = JSON.parse(JSON.stringify(config.associationLogic[device.type]));
    console.log('[NAMING] associationLogic: ', logic);
    let associationId = logic.format.replace('{number}', logic.initialNumber).replace('{letter}', logic.initialLetter).replace('{alnum}', logic.initialAlnum);

    // if the associationId is already present, increment each variable until we find a unique associationId
    while (presentAssociations.includes(associationId)) {
        // increment the number
        logic.initialNumber++;
        // increment the letter
        logic.initialLetter = String.fromCharCode(logic.initialLetter.charCodeAt(0) + 1);
        // increment the alnum
        logic.initialAlnum++;
        associationId = logic.format.replace('{number}', logic.initialNumber).replace('{letter}', logic.initialLetter).replace('{alnum}', logic.initialAlnum);
    }

    console.log('[NAMING] calculated associationId: ', associationId);

    // reset the logic to its initial state
    console.log('[NAMING] resetting logic: ', logic);

    return {
        id: associationId,
        name: associationId,
        type: device.type,
        switchPorts: device.switchPorts? device.switchPorts : 0, // this the actual nb of ports of the switch
        used: true
    }
}

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

    console.log('[NAMING] routersTable: ', JSON.parse(JSON.stringify(routersTable.value)))
    console.log('[NAMING] switchesTable: ', JSON.parse(JSON.stringify(switchesTable.value)))
    console.log('[NAMING] apsTable: ', JSON.parse(JSON.stringify(apsTable.value)))
}

/**
 * Rename devices according to the format string contained in config.name
 * The string will always have the following variable between curly braces: {associationName} which is required to give to a unique id to the device
 * The string can also contain the following variables between curly braces: {networkName}
 */
const renameDevices = () => {
    console.log('[NAMING] devicesList: ', devicesList.value);
    // few checks to ensure that the config is correct (always one equipment and one device in the associationTable (the router))
    if (devicesList.value.length === 0 || config.associationTable.length === 0) {
            console.error('Error renaming devices: devicesList or associationTable is empty');
            console.log('[NAMING] devicesList: ', devicesList.value);
            console.log('[NAMING] associationTable: ', config.associationTable);
            return;
    }

    /*
    if (devicesList.value.some((device: { associationId: string; }) => device.associationId)) {
        // if there are already devices with an associationId, then we are configuring an existing network
        // we need to add the devices to the corresponding table and mark the association as used
        // even on existing networks some devices may not have an associationId, so we need to calculate it if it's missing
        
    }
        */


    for (const device of devicesList.value) {
        // assign a type to the device
        device.type = typeFinder(device.model);

        // if the device already has an associationId, we add its info to the corresponding table and mark the association as used
        // if the associationId is in the table, we just mark it as used
        if (device.associationId) {
            console.log('[NAMING] device already has associationId: ', device.associationId);
            switch (device.type) {
                case 'router':
                    console.log('[NAMING] found router: ', device.associationId);
                    if (routersTable.value.some((a) => a.id === device.associationId)) {
                        console.log('[NAMING] found router in table: ', device.associationId);
                        routersTable.value.find((a) => a.id === device.associationId).used = true;
                    } else {
                        console.log('[NAMING] adding router to table: ', device.associationId);
                        routersTable.value.push({ id: device.associationId, name: device.associationId, type: 'router', used: true });
                    }
                    // add the device to the routers list
                    routers.value.push(device);
                    break;
                case 'switch':
                    console.log('[NAMING] found switch: ', device.associationId);
                    if (switchesTable.value.some((a) => a.id === device.associationId)) {
                        console.log('[NAMING] found switch in table: ', device.associationId);
                        switchesTable.value.find((a) => a.id === device.associationId).used = true;
                    } else {
                        console.log('[NAMING] adding switch to table: ', device.associationId);
                        switchesTable.value.push({ id: device.associationId, name: device.associationId, type: 'switch', used: true });
                    }
                    // add the device to the switches list
                    switches.value.push(device);
                    break;
                case 'ap':
                    console.log('[NAMING] found ap: ', device.associationId);
                    if (apsTable.value.some((a) => a.id === device.associationId)) {
                        console.log('[NAMING] found ap in table: ', device.associationId);
                        apsTable.value.find((a) => a.id === device.associationId).used = true;
                    } else {
                        console.log('[NAMING] adding ap to table: ', device.associationId);
                        apsTable.value.push({ id: device.associationId, name: device.associationId, type: 'ap', used: true });
                    }
                    // add the device to the aps list
                    aps.value.push(device);
                    break;
                default:
                    if (othersTable.value.some((a) => a.id === device.associationId)) {
                        othersTable.value.find((a) => a.id === device.associationId).used = true;
                    } else {
                        othersTable.value.push({ id: device.associationId, name: device.associationId, type: 'other', used: true });
                    }
                    others.value.push(device);
                    break;
            }

            // order each list by ascending associationId first, then by serial
            routers.value.sort((a, b) => a.associationId.localeCompare(b.associationId) || a.serial.localeCompare(b.serial));
            switches.value.sort((a, b) => a.associationId.localeCompare(b.associationId) || a.serial.localeCompare(b.serial));
            aps.value.sort((a, b) => a.associationId.localeCompare(b.associationId) || a.serial.localeCompare(b.serial));
            others.value.sort((a, b) => a.associationId.localeCompare(b.associationId) || a.serial.localeCompare(b.serial));

            // same for the tables
            routersTable.value.sort((a, b) => a.id.localeCompare(b.id));
            switchesTable.value.sort((a, b) => a.id.localeCompare(b.id));
            apsTable.value.sort((a, b) => a.id.localeCompare(b.id));
            othersTable.value.sort((a, b) => a.id.localeCompare(b.id));

            // if the device already has an associationId, we don't need to calculate it
            continue;
        }

        console.log('[NAMING] device does not have associationId: ', device.serial);
        
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

        console.log('[NAMING] association found: ', association);

        // if no association is found, automatically give the device the last association possible
        if (!association) {
            console.log('[NAMING] no association found for device: ', device.serial);
            association = calculateAssociationId(config.associationTable, device);
            switch (device.type) {
                case 'router':
                    routersTable.value.push(association);
                    break;
                case 'switch':
                    switchesTable.value.push(association);
                    break;
                case 'ap':
                    apsTable.value.push(association);
                    break;
                default:
                    othersTable.value.push(association);
                    break;
            }
        }

        // mark the association as used
        association.used = true;

        console.log('[NAMING] after marking association as used: ', routersTable.value, switchesTable.value, apsTable.value, others.value);

        // assign the association id to the device
        device.associationId = association.id;

        // assign the association name to the device
        device.associationName = association.name;

        // also assign the association type to the device
        device.type = association.type;

        // finally, change the name of the device according to the format string
        device.name = config.name.replace('{networkName}', network.value).replace('{associationName}', device.associationName);
    }

}

// reorder switches to fit the config according to ports number (associationTable[n].switchPorts)
const reorderSwitches = async () => {
    for (const switchDevice of switchesTable.value.filter((device: { type: string; }) => device.type === 'switch')) {
        // find the first switch in the associationTable that has the same number of ports as the switchDevice
        // the property switchPorts is an array of integers representing the possible number of ports for the switch, ordered by preference
        // we find the first association in the associationTable that has the same number of ports as the switchDevice and move the switchDevice to the corresponding position
        const switchPorts = switchDevice.switchPorts;
        const association = config.associationTable.find((a: { type: string; switchPorts: any; }) => a.type === 'switch' && a.switchPorts.includes(switchPorts));
        if (!association) {
            console.error('Error reordering switches: no association found for switch with serial: ', switchDevice.serial);
            continue;
        }

        // find the index of the association in the associationTable
        const index = config.associationTable.indexOf(association);

        // find the index of the switchDevice in the devicesList
        const deviceIndex = switchesTable.value.indexOf(switchDevice);

        // if the indexes are different, exange the devices in the table
        if (index !== deviceIndex) {
            let temp = switchesTable.value[index].associationId;
            switchesTable.value[index].associationId = switchDevice.associationId;
            switchDevice.associationId = temp;

            temp = switchesTable.value[index].name;
            switchesTable.value[index].name = switchDevice.name;
            switchDevice.name = temp;
        }
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

    // sort all devices lists by associationId
    [routers, switches, aps, others].forEach((devices) => {
        devices.value.sort((a, b) => a.associationId.localeCompare(b.associationId));
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
            console.log('[NAMING] devicesTyped: ', devicesTyped);
            let matchingDevices = getMatchingDevices(devicesTyped);

            console.log('[NAMING] matchingDevices: ', matchingDevices);

            // sort the devices by associationId
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
    console.log('[NAMING] changeNames: tables values: ', routersTable.value, switchesTable.value, apsTable.value, othersTable.value);

    // updateNames(routers.value, routersTable.value);
    // updateNames(switches.value, switchesTable.value);
    // updateNames(aps.value, apsTable.value);

    console.log('[NAMING] changeNames: devicesList after renaming: ', devicesList.value);
    console.log('[NAMING] changeNames: device lists: ', routers.value, switches.value, aps.value, others.value);

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

    // update the association id, association name and name of the devices
    let temp = devices[index].associationId;
    devices[index].associationId = devices[index - 1].associationId;
    devices[index - 1].associationId = temp;

    temp = devices[index].associationName;
    devices[index].associationName = devices[index - 1].associationName;
    devices[index - 1].associationName = temp;

    temp = devices[index].name;
    devices[index].name = devices[index - 1].name;
    devices[index - 1].name = temp;

    // if type is ap, reorder the aps by ascending associationId
    if (devices === aps.value) {
        aps.value.sort((a, b) => a.associationId.localeCompare(b.associationId));
    }
}

const moveDown = (index: number, devices: any[]) => {
    // swap the device at index with the device at index + 1
    devices.splice(index + 1, 0, devices.splice(index, 1)[0]);

    // update the association id, association name and name of the devices
    let temp = devices[index].associationId;
    devices[index].associationId = devices[index + 1].associationId;
    devices[index + 1].associationId = temp;

    temp = devices[index].associationName;
    devices[index].associationName = devices[index + 1].associationName;
    devices[index + 1].associationName = temp;

    temp = devices[index].name;
    devices[index].name = devices[index + 1].name;
    devices[index + 1].name = temp;

    // if type is ap, reorder the aps by ascending associationId
    if (devices === aps.value) {
        aps.value.sort((a, b) => a.associationId.localeCompare(b.associationId));
    }
}

const changeAddress = async () => {
    // change every device address to the new address
    for (const device of devicesList.value) {
        await changeDeviceAddress(device.serial, address.value);
        //console.log('[NAMING] changeAddress response: ', resp);
    }
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

    console.log('[NAMING] devicesList before renaming: ', JSON.parse(JSON.stringify(devicesList.value)));

    renameDevices();
    console.log('[NAMING] devicesList after renaming: ', devicesList.value);
    console.log('[NAMING] device lists: ', routers.value, switches.value, aps.value, others.value);

    // sort deviceList by associationId
    devicesList.value.sort((a: { associationId: string; }, b: { associationId: any; }) => a.associationId.localeCompare(b.associationId));

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
    <div id="naming-page">
        <h1>Names</h1>
        <Divider style="width: 250px;" />
        <div v-if="devicesLoaded" id="naming-form" class="make-column">
            <div class="make-column">
                <div class="make-row">
                    <h2>Routers</h2>
                </div>
                <DataTable :value="routers" tableStyle="min-width: 50rem" editMode="row"
                    @row-edit-save="(event) => onRowEditSave(event, routers)" v-model:editingRows="editingRows" dataKey="serial"
                    @row-edit-init="(event) => console.log('[NAMING]: Row edit init: ', event)"
                    :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                style:  state['d_editing']&&'padding-top: 0.75rem; padding-bottom: 0.75rem'
                            })
                        }
                    }"
                >
                    <Column field="model" header="Model" style="width: 20%;"></Column>
                    <Column field="serial" header="Serial" style="min-width: 25%;"></Column>
                    <Column field="name" header="Name" style="max-width: 10%;">
                        <template #editor="{ data, field }">
                            <InputText v-model="data[field]" fluid/>
                        </template>
                    </Column>
                    <!--Column field="associationName" header="Association Name" style="width: 22%;">
                        <template #editor="{ data, field }">
                            <InputText v-model="data[field]" fluid/>
                        </template>
                    </Column-->
                    <Column field="associationId" style="width: 10%;">
                        <template #editor="{ data, field }">
                            <Select v-model="data[field]" :options="routersTable"
                                optionValue="id" optionLabel="id" fluid @change="console.log('[NAMING]: Data when changing the thingy: ', data); data.associationName = data.associationId">
                            </Select>
                        </template>
                        <template #header>
                            <span style="font-weight:600">ID</span>
                            <i class="pi pi-exclamation-circle" style="margin-left: 5px; cursor: pointer; color: var(--p-yellow-500);" @click="toggleIdHelp"></i>
                            <Popover ref="idHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                                <p>This field may require modifications.<br>Make sure to assign the right ID to each type of equipment depending on their model.</p>
                            </Popover>
                        </template>
                    </Column>
                    <Column :row-editor="true" style="width: 10%; min-width: 8rem" bodyStyle="text-align:center"></Column>
                </DataTable>
            </div>
            <div class="make-column">
                <div class="make-row" style="margin-top: 20px;">
                    <h2>Switches</h2>
                </div>
                <DataTable :value="switches" tableStyle="min-width: 50rem" editMode="row"
                    @row-edit-save="(event) => onRowEditSave(event, switches)" v-model:editingRows="editingRows" dataKey="serial"
                    @row-edit-init="(event) => console.log('[NAMING]: Row edit init: ', event)"
                    :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                style:  state['d_editing']&&'padding-top: 0.75rem; padding-bottom: 0.75rem'
                            })
                        }
                    }"
                >
                    <Column field="model" header="Model" style="width: 20%;"></Column>
                    <Column field="serial" header="Serial" style="min-width: 15%;"></Column>
                    <Column field="name" header="Name">
                        <template #editor="{ data, field }">
                            <InputText v-model="data[field]" fluid/>
                        </template>
                    </Column>
                    <!-- Column field="associationName" header="Association Name" style="width: 25%;">
                        <template #editor="{ data, field }">
                            <InputText v-model="data[field]" fluid/>
                        </template>
                    </Column-->
                    <Column field="associationId" style="width: 10%;">
                        <template #editor="{ data, field }">
                            <Select v-model="data[field]" :options="switchesTable"
                                optionValue="id" optionLabel="id" fluid @change="console.log('[NAMING]: Data when changing the thingy: ', data); data.associationName = data.associationId">
                            </Select>
                        </template>
                        <template #header>
                            <span style="font-weight:600">ID</span>
                            <i class="pi pi-exclamation-circle" style="margin-left: 5px; cursor: pointer; color: var(--p-yellow-500);" @click="toggleIdHelp"></i>
                            <Popover ref="idHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                                <p>This field may require modifications.<br>Make sure to assign the right ID to each type of equipment depending on their model.</p>
                            </Popover>
                        </template>
                    </Column>
                    <Column :row-editor="true" style="width: 10%; min-width: 8rem" bodyStyle="text-align:center"></Column>
                </DataTable>
            </div>
            <div class="make-column">
                <div class="make-row" style="margin-top: 20px;">
                    <h2>Access Points</h2>
                </div>
                <DataTable :value="aps" tableStyle="min-width: 50rem" editMode="row"
                    @row-edit-save="(event) => onRowEditSave(event, aps)" v-model:editingRows="editingRows" dataKey="serial"
                    @row-edit-init="(event) => console.log('[NAMING]: Row edit init: ', event)"
                    :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                style:  state['d_editing']&&'padding-top: 0.75rem; padding-bottom: 0.75rem'
                            })
                        }
                    }"
                >
                    <Column field="model" header="Model" style="width: 20%;"></Column>
                    <Column field="serial" header="Serial" style="min-width: 15%;"></Column>
                    <Column field="name" header="Name">
                        <template #editor="{ data, field }">
                            <InputText v-model="data[field]" fluid/>
                        </template>
                    </Column>
                    <!-- Column field="associationName" header="Association Name" style="width: 25%;">
                        <template #editor="{ data, field }">
                            <InputText v-model="data[field]" fluid/>
                        </template>
                    </Column-->
                    <Column field="associationId" style="width: 10%;">
                        <template #editor="{ data, field }">
                            <Select v-model="data[field]" :options="apsTable"
                                optionValue="id" optionLabel="id" fluid @change="console.log('[NAMING]: Data when changing the thingy: ', data); data.associationName = data.associationId">
                            </Select>
                        </template>
                        <template #header>
                            <span style="font-weight:600">ID</span>
                            <i class="pi pi-exclamation-circle" style="margin-left: 5px; cursor: pointer; color: var(--p-yellow-500);" @click="toggleIdHelp"></i>
                            <Popover ref="idHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                                <p>This field may require modifications.<br>Make sure to assign the right ID to each type of equipment depending on their model.</p>
                            </Popover>
                        </template>
                    </Column>
                    <Column :row-editor="true" style="width: 10%; min-width: 8rem" bodyStyle="text-align:center"></Column>
                </DataTable>
            </div>
            <div class="col center" style="margin-top: 40px;">
                <h2>Tagging</h2>
                <DataTable :value="aps" tableStyle="min-width: 50rem" editMode="row"
                    @row-edit-save="(event) => onRowEditSaveTags(event, aps)" v-model:editingRows="editingRows" dataKey="serial"
                    @row-edit-init="(event) => console.log('[NAMING]: Row edit init: ', event)"
                    :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                style:  state['d_editing']&&'padding-top: 0.75rem; padding-bottom: 0.75rem'
                            })
                        }
                    }"
                >
                    <Column field="model" header="Model" style="min-width: 0%;"></Column>
                    <Column field="serial" header="Serial" style="min-width: 15%;"></Column>
                    <Column field="associationId" header="ID" style="min-width: 0%;"></Column>
                    <Column field="tags" header="Tags" style="width: 40%;">
                        <!-- -->
                        <template #body="{ data }">
                            <Tag v-for="(tag, index) in data.tags" :key="index" :value="tag"
                                style="margin-left: 10px;"
                            >{{ tag }}</Tag>
                        </template>
                        <template #editor="{ data, field }">
                            <MultiSelect v-model="data[field]" :options="config.tags" fluid
                                optionValue="name" optionLabel="name" placeholder="Select tags" display="chip"/>
                        </template>
                    </Column>
                    <Column :row-editor="true" style="width: 10%; min-width: 8rem" bodyStyle="text-align:center"></Column>
                </DataTable>
            </div>
            <div style="margin-top: 40px; margin-bottom: 10px">
                <h2>Address</h2>
                <InputText v-model="address" placeholder="Enter an address" style="margin-right: 20px;"/>
                <Button @click="changeAddress" style="margin-right: 15px;">Save</Button>

                <span class="pi pi-question-circle" @click="toggleSaveAddressHelp" style="align-self: flex-end;"></span>

                <Popover ref="saveAddressHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                    <p>Use this field in case you made a mistake setting the network address in the setup.<br>
                        This field is only saved when using the dedicated button.</p>
                </Popover>
            </div>
            <Divider style="width: 250px;" />
            <div style="margin-top: 20px;"></div>
            <!--Button class="margin-padding" @click="changeNames">Save</Button-->
            <Button class="margin-padding" @click="changeNames"
            :disabled="(renaming)">
            <v-progress-circular v-if="renaming" indeterminate color="#fff" width="3"></v-progress-circular>
            <span v-else>Save changes</span>
            <p v-if="renaming">Renaming devices...</p>
            </Button>
            <div class="make-row margin-padding">
                <Button class="margin-padding" @click="goBack">Back</Button>
                <Button class="margin-padding" @click="validate">Next</Button>
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

    #naming-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 20px;
    }

    .p-150 {
        min-width: 150px;
    }

    p {
        min-width: 100px;
    }
</style>
