<script setup>
import { ref, onMounted } from 'vue'
import { claimDevices } from '../endpoints/devices/ClaimDevices.vue'
import { getDevice } from '../endpoints/devices/GetDevice.vue'
import { removeDeviceFromNetwork } from '../endpoints/networks/RemoveDeviceFromNetwork.vue'
import { getNetwork } from '../endpoints/networks/GetNetwork.vue'
import { parseDevices, checkDeviceInInventory } from '../Utils/Misc.vue'
import { checkDeviceInNetwork } from '../Utils/DevicePossession.vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useStatesStore } from '@/stores/states'
import { storeToRefs } from 'pinia'

const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const newNetworkDevices = ref('')
const confirmMoveNetwork = ref(false)
const showMoveNetwork = ref(false)

const alreadyInNetwork = ref([])
const alreadyInNetworkWithInfo = ref([])

const devicesAdded = ref(false)

const fullFinalDevices = ref([])

/**
 * Checks if the devices are already claimed (ie. is in the organization inventory)
 */
const checkClaimedDevices = async (devicesUnprocessed) => {
    let claimedDevices = []
    let devicesToAdd = []
    console.log('[CLAIM] devicesUnprocessed: ', devicesUnprocessed)

    for (const device of devicesUnprocessed) {
        let inInventory = await checkDeviceInInventory(device, orgId.value)

        if (!inInventory) {
            claimedDevices.push(device)
        } else {
            devicesToAdd.push(device)
        }
    }
    return { toClaim: claimedDevices, devicesToAdd: devicesToAdd }
}

const addDevices = async () => {
    // turn devices into an array
    let newDevices = parseDevices(newNetworkDevices.value)

    // check if some devices are already claimed
    let { toClaim, devicesToAdd } = await checkClaimedDevices(newDevices)

    if (!confirmMoveNetwork.value) {
        for (const device of devicesToAdd) {
            const inNetwork = await checkDeviceInNetwork(device, orgId.value)

            if (inNetwork.possessed) {
                console.log('[CLAIM] Device already in network: ', inNetwork.device.networkId)

                alreadyInNetwork.value.push(inNetwork.device.serial)
                devicesToAdd = devicesToAdd.filter(serial => serial !== inNetwork.device.serial)
            } else {
                console.log('[CLAIM] Device not in network')

                toClaim.push(inNetwork.device.serial)
                devicesToAdd = devicesToAdd.filter(serial => serial !== inNetwork.device.serial)
            }
        }
    }

    console.log('[CLAIM] Devices to claim: ', toClaim)
    console.log('[CLAIM] Devices to add: ', devicesToAdd)
    console.log('[CLAIM] Devices already in network: ', alreadyInNetwork.value)

    if (toClaim.length === 0 && alreadyInNetwork.value.length === 0) {
        console.log('[CLAIM] No devices to claim')
        return
    }
    if (toClaim.length === 0 && alreadyInNetwork.value.length > 0) {
        // handle devices already in network

        // populate info for the devices already in a network (get their parent network name)
        console.log('[CLAIM] Getting network info for devices already in network')
        for (const serial of alreadyInNetwork.value) {
            const device = await getDevice(serial)
            const network = await getNetwork(device.networkId)
            alreadyInNetworkWithInfo.value.push({ serial: serial, network: network.name, network_id: network.id })
        }

        showMoveNetwork.value = true
    }

    // call the claimDevices endpoint
    const response = await claimDevices(newNetworkId.value, toClaim)
    if (response && response.serials) {
        console.log('[CLAIM] Devices added to network: ', response.serials)
        // add devices to the devices store
        for (const serial of response.serials) {
            const device = await getDevice(serial)
            fullFinalDevices.value.push(device)
        }

        // update the devices store with the new devices, we get full device info from the API
        devices.$patch({devicesList: fullFinalDevices.value})

        devicesAdded.value = true
    } else {
        console.error('[CLAIM] Error adding devices to network')
    }
}

// Absolutely not a crap solution *cope*
const moveDevices = async () => {
    // remove the devices already in network from their networks
    for (const obj of alreadyInNetworkWithInfo.value) {
        const serial = obj.serial
        const network = obj.network_id
        console.log('[CLAIM] Removing device from network: ', serial, network)
        await removeDeviceFromNetwork(network, serial)
    }

    // claim the devices removed from their networks
    // put their serials in the newNetworkDevices string, separated by newlines
    let serials = alreadyInNetworkWithInfo.value.map(obj => obj.serial).join('\n')
    newNetworkDevices.value = serials

    // reset the alreadyInNetwork array
    alreadyInNetwork.value = []

    // add the devices to the new network
    await addDevices()
}

const validate = () => {
    // set the claimDone state to true
    states.$patch({claimDone: true})
}
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
            <button @click="showMoveNetwork = false">Continue without those devices</button>
        </template>
        <p v-if="devicesAdded">Devices added to network</p>
        <button @click="validate">Next</button>
    </div>
</template>

<style scoped>

</style>
