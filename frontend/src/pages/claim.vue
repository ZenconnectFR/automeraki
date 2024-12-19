<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { claimDevices } from '@/endpoints/devices/ClaimDevices'
import { getNetwork } from '@/endpoints/networks/GetNetwork'
import { getInventoryDevices } from '@/endpoints/organizations/GetInventoryDevices'
import { parseDevices } from '@/utils/Misc'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { useNextStatesStore } from '@/stores/nextStates'
import { storeToRefs } from 'pinia'
import { useProgressStore } from '@/stores/progress'
import { changeDeviceAddress } from '@/endpoints/devices/ChangeDeviceAddress'

import { useRouter, useRoute } from 'vue-router'
import { getDevice } from '@/endpoints/devices/GetDevice'

import { getRoutePath } from '@/utils/PageRouter'

import Textarea from 'primevue/textarea'
import Divider from 'primevue/divider'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const router = useRouter()
const route = useRoute()

// stores
const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()
const nextStates = useNextStatesStore()
const progress = useProgressStore()


// info from the stores
const { newNetworkId, orgId } = storeToRefs(ids)
const { configuration, currentPageIndex } = storeToRefs(configStore)
let thisState = nextStates.getState(currentPageIndex.value)

const newNetworkDevices = ref('') // Input field for new network devices serials
const confirmMoveNetwork = ref(false) // Confirm the move network warning
const showMoveNetwork = ref(false) // Show the move network warning

const inventoryDevices = ref([] as any[]) // devices in the organization inventory
const inventoryFetched = ref(false) // flag to know if the inventory has been fetched
const inventoryUpdated = ref(false) // flag to know if the inventory has been updated
const parsedDevices = ref([] as any[]) // devices parsed from the input field

const alreadyInNetwork = ref([] as any[]) // devices already in a network (full devices info)
const alreadyInNetworkWithInfo = ref([] as any[]) // devices already in a network (with network info and abridged device info)
const toClaim = ref([] as any[]) // devices to claim (string serials)

const fullFinalDevices = ref([] as any[]) // full devices info after adding them to the network

const claiming = ref(false)

// --------------------------- CLAIM REFACTORED ---------------------------

const correctInput = () => {
    let parsed = parseDevices(newNetworkDevices.value)
    newNetworkDevices.value = parsed.join('\n')
}

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
    console.log('[CLAIM] Checking device possessions')
    for (const device of inventoryDevices.value) {
        console.log('[CLAIM] Checking device in inventory: ', device)
        // only consider the devices that are in the parsedDevices array
        if (parsedDevices.value.includes(device.serial)) {
            if (device.networkId) {
                // if the device is already in a network, add it to the alreadyInNetwork array
                console.log('[CLAIM] Device already in network: ', device)
                alreadyInNetwork.value.push(device)
            } else {
                // if the device is not in a network, add it to the toClaim array
                console.log('[CLAIM] Device not in network: ', device)
                toClaim.value.push(device.serial)
            }
        }
    }
    // add the devices in parsedDevices that are not in the inventory to the toClaim array
    for (const serial of parsedDevices.value) {
        if (!inventoryDevices.value.find(device => device.serial === serial)) {
            console.log('[CLAIM] Device to add not found in inventory: ', serial)
            toClaim.value.push(serial)
        }
    }
}

const { address } = storeToRefs(devices)

const changeAddresses = async(devicesToChange: { serial: string }[]) => {
    for (const device of devicesToChange) {
        await changeDeviceAddress(device.serial, address.value);
    }
}

/**
 * Main logic for adding devices to a network.
 */
const addDevices = async () => {
    // parse the devices from the input field
    parsedDevices.value = parseDevices(newNetworkDevices.value)

    console.log('[CLAIM] alreadyInNetwork: ', JSON.stringify(alreadyInNetwork.value))
    console.log('[CLAIM] alreadyInNetworkWithInfo: ', JSON.stringify(alreadyInNetworkWithInfo.value))
    console.log('[CLAIM] toClaim: ', JSON.stringify(toClaim.value))

    // empty all the necessary arrays in case the user adds devices multiple times
    alreadyInNetwork.value.splice(0, alreadyInNetwork.value.length)
    alreadyInNetworkWithInfo.value.splice(0, alreadyInNetworkWithInfo.value.length)
    toClaim.value.splice(0, toClaim.value.length)

    console.log('[CLAIM] alreadyInNetwork after: ', JSON.stringify(alreadyInNetwork.value))
    console.log('[CLAIM] alreadyInNetworkWithInfo after: ', JSON.stringify(alreadyInNetworkWithInfo.value))
    console.log('[CLAIM] toClaim after: ', JSON.stringify(toClaim.value))

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
            if (network) {
                if (network.id !== newNetworkId.value) {
                    alreadyInNetworkWithInfo.value.push({ serial: device.serial, network: network.name, network_id: network.id })
                } else {
                    // if the device is already in the new network, simply don't try to claim it
                    toClaim.value = toClaim.value.filter(serial => serial !== device.serial)
                }
            }
        }

        if (alreadyInNetworkWithInfo.value.length > 0) {
            showMoveNetwork.value = true
            return
        }
    }

    console.log('[CLAIM] Devices to claim: ', toClaim.value)

    // If toClaim is empty, we can skip the claimDevices call and show a message
    if (toClaim.value.length === 0) {
        toast.add({ severity: 'info', summary: 'No new devices to add to the network', life: 3000 })
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

        await changeAddresses(fullFinalDevices.value) // immediately change the addresses of the devices
        toast.add({ severity: 'success', summary: 'Devices added to network', life: 3000 })

        await retrieveInventory(parsedDevices.value) // update the inventory
    } else {
        if (response && response.error === 'Devices already claimed') {
            toast.add({ severity: 'info', summary: 'Devices already in network', life: 3000 })
        } else {
            console.error('[CLAIM] Error adding devices to network, most likely the devices are already used by another organization')
            toast.add({ severity: 'error', summary: 'Error adding devices to network', life: 3000, detail: 'Most likely the devices are already used by another organization' })
        }
    }
    claiming.value = false

    thisState = true;
    nextStates.setStateTrue(configStore.currentPageIndex)
}

const validate = async() => {
    // 
    configStore.setCurrentPageIndex(1)
    configStore.setCurrentPageConfig(configuration.value.actions[1].data)

    progress.save(devices.getDevicesList(), 1, nextStates.getStates()) // next page is 1 since claim is always the first step

    router.push(getRoutePath(configuration.value.actions[1].type))
}

</script>

<template>
    <div id="claim-page">
        <h1>Claim Devices</h1>
        <Divider style="width: 250px;"/>
        <div id="claim-devices-form" class="col center">
            <Textarea id="claim-form" autoResize cols="50" rows="5" v-if="newNetworkId"
            v-model="newNetworkDevices" placeholder="Enter new network devices serials" @change="correctInput" @input="correctInput"/>
            <!--Button class="margin-padding-all-normal" style="width: 50%;" v-if="newNetworkId" @click="addDevices">Add Devices</Button-->
            <Button class="margin-all-normal constant-width-250 constant-height-40" @click="addDevices"
            :disabled="(!newNetworkId || claiming)">
            <v-progress-circular v-if="claiming" indeterminate color="#fff" width="3"></v-progress-circular>
            <span v-else>Add Devices</span>
        </Button>
        </div>
        <!-- p v-if="claiming">Claiming devices...</p-->
        <template v-if="showMoveNetwork">
            <h2> WARNING: The following devices are already in a network : </h2>
            <ul>
                <li v-for="device in alreadyInNetworkWithInfo" :key="device.serial">
                    {{device.serial}} is in network {{device.network}}
                </li>
            </ul>
            <p>Please either remove them from their networks or continue without them</p>
            <!--button class="margin-padding-all-normal" @click="moveDevices">I understand, move them to the new network</button>
            <button class="margin-padding-all-normal" @click="showMoveNetwork = false; confirmMoveNetwork = true; removeAlreadyInNetwork() ;addDevices()">Continue without those devices</button-->
        </template>
        <Toast position="top-right" />
        <Button :disabled="!thisState" class="margin-padding-all-normal" @click="validate">Next</Button>
    </div>
</template>

<style scoped>
    .margin-padding-all-normal {
        margin: 10px;
        padding: 10px;
    }

    #claim-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 40%;
        width: 40%;
        margin-top: 40px;
    }

    #claim-form {
        margin: 10px;
        padding: 10px;
        border : 1px solid rgb(136, 136, 136);
        border-radius: 8px;
        width: 500px;
    }
</style>
