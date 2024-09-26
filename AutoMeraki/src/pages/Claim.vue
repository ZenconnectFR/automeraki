<script setup>
import { ref, onMounted } from 'vue'
import { claimDevices } from '../endpoints/devices/ClaimDevices.vue'
import { getDevice } from '../endpoints/devices/GetDevice.vue'
import { removeDeviceFromNetwork } from '../endpoints/networks/RemoveDeviceFromNetwork.vue'
import { getNetwork } from '../endpoints/networks/GetNetwork.vue'
import { getInventoryDevices } from '../endpoints/organization/GetInventoryDevices.vue'
import { parseDevices } from '../utils/Misc.vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useStatesStore } from '@/stores/states'
import { storeToRefs } from 'pinia'

// stores
const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

const { newNetworkId, orgId } = storeToRefs(ids)

const newNetworkDevices = ref('') // Input field for new network devices serials
const confirmMoveNetwork = ref(false)
const showMoveNetwork = ref(false)

const inventoryDevices = ref([]) // devices in the organization inventory
const inventoryFetched = ref(false)
const parsedDevices = ref([]) // devices parsed from the input field

const alreadyInNetwork = ref([]) // devices already in a network (full objects)
const alreadyInNetworkWithInfo = ref([]) // devices already in a network (with network info)
const toClaim = ref([]) // devices to claim (string serials)

const devicesAdded = ref(false)

const fullFinalDevices = ref([]) // full devices info after adding them to the network

const usedByAnotherOrg = ref(false)

// --------------------------- CLAIM REFACTORED ---------------------------

const retrieveInventory = async (parsedDevices) => {
    // get the inventory devices
    inventoryDevices.value = await getInventoryDevices(orgId.value, parsedDevices)
    inventoryFetched.value = true
}

/**
 * Check if a device is already in a network, the info will be in the details of the device in the inventoryDevices array
 * If no networkId is found, the device is not in a network, add it to the toClaim array
 * If a networkId is found, the device is in a network, add it to the alreadyInNetwork array
 */
const checkDevicePossessions = () => {
    for (const deviceProxy of Object.entries(inventoryDevices.value)) {
        const device = deviceProxy[1]
        // console.log('[CLAIM] Checking device possession: ', device)
        for (const serial of parsedDevices.value) {
            // console.log('[CLAIM] Checking device: ', device, ' against serial: ', serial)
            if (device.serial === serial) {
                // console.log('[CLAIM] Device found in inventory: ', device)
                if (device.networkId) {
                    console.log('[CLAIM] Device already in network: ', device)
                    alreadyInNetwork.value.push(device)
                } else {
                    console.log('[CLAIM] Device not in network: ', device)
                    toClaim.value.push(serial)
                }
            }
        }
    }
}


const addDevices = async () => {
    parsedDevices.value = parseDevices(newNetworkDevices.value)

    // get the inventory devices
    if (!inventoryFetched.value) { // We call this function twice when there are devices already in a network, so we need to check if we already fetched the inventory
        await retrieveInventory(parsedDevices.value)
    }

    // check if the devices are already in a network
    checkDevicePossessions()

    // handle devices already in network
    if (!confirmMoveNetwork.value && alreadyInNetwork.value.length > 0) {
        for (const device of alreadyInNetwork.value) {
            const network = await getNetwork(device.networkId)
            alreadyInNetworkWithInfo.value.push({ serial: device.serial, network: network.name, network_id: network.id })
        }

        showMoveNetwork.value = true

        return // we will call addDevices again after the user confirms (or not) the move
    }

    console.log('[CLAIM] Devices to claim: ', toClaim.value)

    // else, call the claimDevices endpoint
    const response = await claimDevices(newNetworkId.value, toClaim.value)
    if (response && response.serials) {
        console.log('[CLAIM] Devices added to network: ', response.serials)
        // add devices to the devices store
        for (const serial of response.serials) {
            // get info for the device from the inventory
            const device = inventoryDevices.value.find(device => device.serial === serial)
            fullFinalDevices.value.push(device)
        }

        // update the devices store with the new devices, we get full device info from the API
        console.log('[CLAIM] Updating devices store with new devices: ', fullFinalDevices.value)
        devices.$patch({devicesList: fullFinalDevices.value})

        devicesAdded.value = true
    } else {
        usedByAnotherOrg.value = true
        console.error('[CLAIM] Error adding devices to network, most likely the devices are already used by another organization')
    }
}

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

    // add the devices to the new network
    await addDevices()

    // reset the alreadyInNetworkWithInfo array
    alreadyInNetworkWithInfo.value = []

    // reset the alreadyInNetwork array
    alreadyInNetwork.value = []

    // close the move network warning
    showMoveNetwork.value = false
}

const validate = () => {
    // set the claimDone state to true
    states.$patch({claimDone: true})
}

onMounted(() => {
})

</script>

<template>
    <div id="claim page">
        <h1>Claim Devices</h1>
        <div id="claim-devices-form">
            <textarea v-if="newNetworkId" v-model="newNetworkDevices" placeholder="Enter new network devices serials"></textarea>
            <button v-if="newNetworkId" @click="addDevices">Add Devices</button>
        </div>
        <template v-if="showMoveNetwork">
            <h2> WARNING: The following devices are already in a network : </h2>
            <ul>
                <li v-for="device in alreadyInNetworkWithInfo" :key="device.serial">
                    {{device.serial}} is in network {{device.network}}
                </li>
            </ul>
            <button @click="moveDevices">I understand, move them to the new network</button>
            <button @click="showMoveNetwork = false; confirmMoveNetwork = true">Continue without those devices</button>
        </template>
        <template v-if="usedByAnotherOrg">
            <p>Impossible to claim some devices, they most likely belong to another organization inventory</p>
        </template>
        <p v-if="devicesAdded">Devices added to network</p>
        <button @click="validate">Next</button>
    </div>
</template>

<style scoped>

</style>
