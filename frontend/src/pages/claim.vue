<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { claimDevices } from '@/endpoints/devices/ClaimDevices'
import { removeDeviceFromNetwork } from '@/endpoints/networks/RemoveDeviceFromNetwork'
import { getNetwork } from '@/endpoints/networks/GetNetwork'
import { getInventoryDevices } from '@/endpoints/organizations/GetInventoryDevices'
import { parseDevices } from '@/utils/Misc'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'
import { changeDeviceAddress } from '@/endpoints/devices/ChangeDeviceAddress'

import { useRouter, useRoute } from 'vue-router'
import { getDevice } from '@/endpoints/devices/GetDevice'

import { getRoutePath } from '@/utils/PageRouter'

const router = useRouter()
const route = useRoute()

// stores
const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()


// info from the stores
const { newNetworkId, orgId } = storeToRefs(ids)
const { configuration } = storeToRefs(configStore)

const newNetworkDevices = ref('') // Input field for new network devices serials
const confirmMoveNetwork = ref(false) // Confirm the move network warning
const showMoveNetwork = ref(false) // Show the move network warning

const inventoryDevices = ref([]) // devices in the organization inventory
const inventoryFetched = ref(false) // flag to know if the inventory has been fetched
const inventoryUpdated = ref(false) // flag to know if the inventory has been updated
const parsedDevices = ref([]) // devices parsed from the input field

const alreadyInNetwork = ref([]) // devices already in a network (full devices info)
const alreadyInNetworkWithInfo = ref([]) // devices already in a network (with network info and abridged device info)
const toClaim = ref([]) // devices to claim (string serials)

const devicesAdded = ref(false)
const noDevicesToAdd = ref(false)

const fullFinalDevices = ref([]) // full devices info after adding them to the network

const usedByAnotherOrg = ref(false)

const claiming = ref(false)

// --------------------------- CLAIM REFACTORED ---------------------------

const retrieveInventory = async (parsedDevices: string[]) => {
    // get the inventory devices
    console.log('[CLAIM] Getting inventory devices')
    inventoryDevices.value = await getInventoryDevices(orgId.value, parsedDevices)
    inventoryFetched.value = true
}

/**
 * Check if the devices are already in a network
 * We only need to check the inventory for devices that are not already in a network
 * if they are, add them to the alreadyInNetwork array
 * else add them to the toClaim array
 */
const checkDevicePossessions = () => {
    for (const device of inventoryDevices.value) {
        if (device.networkId) {
            alreadyInNetwork.value.push(device)
        } else {
            toClaim.value.push(device.serial)
        }
    }
    // add the devices in parsedDevices that are not in the inventory to the toClaim array
    for (const serial of parsedDevices.value) {
        if (!inventoryDevices.value.find(device => device.serial === serial)) {
            toClaim.value.push(serial)
        }
    }
}

const { address } = storeToRefs(devices)

const changeAddresses = async() => {
    for (const device of fullFinalDevices.value) {
        await changeDeviceAddress(device.serial, address.value);
    }
}

/**
 * Main logic for adding devices to a network.
 */
const addDevices = async () => {
    // parse the devices from the input field
    parsedDevices.value = parseDevices(newNetworkDevices.value)

    console.log('[CLAIM] Parsed devices: ', parsedDevices.value)

    // get the devices in inventory if they haven't been fetched yet
    if (!inventoryFetched.value || inventoryUpdated.value) {
        await retrieveInventory(parsedDevices.value)
        inventoryFetched.value = inventoryDevices.value.length > 0
    }

    // check if the devices are already in a network
    checkDevicePossessions()

    // If one or more devices are already in a network, show a warning and ask the user to confirm the move
    // Gets skipped if the user already confirmed the move
    if (alreadyInNetwork.value.length > 0 && !confirmMoveNetwork.value) {
        for (const device of alreadyInNetwork.value) {
            const network = await getNetwork(device.networkId)
            alreadyInNetworkWithInfo.value.push({ serial: device.serial, network: network.name, network_id: network.id })
        }

        showMoveNetwork.value = true
        return // we will call addDevices again after the user confirms (or not) the move
    }

    console.log('[CLAIM] Devices to claim: ', toClaim.value)

    // If toClaim is empty, we can skip the claimDevices call and show a message
    if (toClaim.value.length === 0) {
        noDevicesToAdd.value = true
        return
    }

    // show the claiming message
    claiming.value = true

    // Call the claimDevices endpoint
    const response = await claimDevices(newNetworkId.value, toClaim.value)
    if (response && response.serials) {
        console.log('[CLAIM] Devices added to network: ', response.serials)
        // add devices to the devices store
        for (const serial of response.serials) {
            // get info for the device from the inventory, if it's not there, it's a new device and we fetch it from the API
            const device = inventoryDevices.value.find(device => device.serial === serial)
            if (device) {
                fullFinalDevices.value.push(device)
            } else {
                const newDevice = await getDevice(serial)
                console.log('[CLAIM] New device: ', newDevice)
                fullFinalDevices.value.push(newDevice)
            }
        }

        // update the devices store with the new devices, we get full device info from the API
        console.log('[CLAIM] Updating devices store with new devices: ', fullFinalDevices.value)
        devices.addDevices(fullFinalDevices.value)

        await changeAddresses() // immediately change the addresses of the devices
        devicesAdded.value = true
    } else {
        usedByAnotherOrg.value = true
        console.error('[CLAIM] Error adding devices to network, most likely the devices are already used by another organization')
    }
    claiming.value = false
}

/**
 * Handle the move network warning: remove the devices from their networks and add them to the new network
 */
const moveDevices = async () => {
    // remove the devices already in network from their networks
    for (const device of alreadyInNetwork.value) {
        console.log('[CLAIM] Removing device from network: ', device)
        await removeDeviceFromNetwork(device.networkId, device.serial)
    }

    // add the devices to the toClaim array
    for (const device of alreadyInNetwork.value) {
        toClaim.value.push(device.serial)
    }

    // set the confirmMoveNetwork to true
    confirmMoveNetwork.value = true

    inventoryUpdated.value = true

    // add the devices to the new network
    await addDevices()

    // reset the alreadyInNetworkWithInfo array
    alreadyInNetworkWithInfo.value = []

    // reset the alreadyInNetwork array
    alreadyInNetwork.value = []

    // close the move network warning
    showMoveNetwork.value = false
}

/**
 * Remove the devices that are already in a network from the toClaim array and the input field
 * Used when the user continues without the devices in the move network warning
 */
const removeAlreadyInNetwork = () => {
    // Empty the toClaim array
    toClaim.value = []

    // remove the devices from the input field by regex matching
    for (const device of alreadyInNetwork.value) {
        const regex = new RegExp(device.serial, 'g')
        newNetworkDevices.value = newNetworkDevices.value.replace(regex, '');
    }

    // remove empty lines
    newNetworkDevices.value = newNetworkDevices.value.replace(/^\s*[\r\n]/gm, '');
}

const validate = async() => {
    // 
    configStore.setCurrentPageIndex(0) // init, will increment in further steps
    configStore.setCurrentPageConfig(configuration.value.actions[0].data)
    router.push(getRoutePath(configuration.value.actions[0].type))
}

</script>

<template>
    <div id="claim-page">
        <h1>Claim Devices</h1>
        <div id="claim-devices-form" class="make-column">
            <textarea class="margin-padding-all-normal round-normal" v-if="newNetworkId" v-model="newNetworkDevices" placeholder="Enter new network devices serials"></textarea>
            <button class="margin-padding-all-normal" v-if="newNetworkId" @click="addDevices">Add Devices</button>
        </div>
        <p v-if="claiming">Claiming devices...</p>
        <template v-if="showMoveNetwork">
            <h2> WARNING: The following devices are already in a network : </h2>
            <ul>
                <li v-for="device in alreadyInNetworkWithInfo" :key="device.serial">
                    {{device.serial}} is in network {{device.network}}
                </li>
            </ul>
            <button class="margin-padding-all-normal" @click="moveDevices">I understand, move them to the new network</button>
            <button class="margin-padding-all-normal" @click="showMoveNetwork = false; confirmMoveNetwork = true; removeAlreadyInNetwork() ;addDevices()">Continue without those devices</button>
        </template>
        <template v-if="usedByAnotherOrg">
            <p>Impossible to claim some devices, they most likely belong to another organization inventory</p>
        </template>
        <p v-if="devicesAdded">Devices added to network</p>
        <p v-if="noDevicesToAdd">No new devices to add to the new network</p>
        <button class="margin-padding-all-normal" @click="validate">Next</button>
    </div>
</template>

<style scoped>
    .make-column {
        display: flex;
        flex-direction: column;
    }

    .margin-padding-all-normal {
        margin: 10px;
        padding: 10px;
    }

    .round-normal {
        border-radius: 4px;
    }

    #claim-devices-form {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
    }

    #claim-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 40%;
        width: 40%;
    }

    textarea {
        width: 100%;
        height: 100px;
        overflow-y: scroll;
    }
</style>
