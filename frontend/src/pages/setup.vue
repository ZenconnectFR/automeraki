<script setup lang="ts">

import { ref, onMounted } from 'vue'
import { getOrganizations } from '@/endpoints/organizations/GetOrganizations'
import { getNetworks } from '@/endpoints/networks/GetNetworks'
import { getNetworkDevices } from '@/endpoints/networks/GetNetworkDevices'
import { cloneNetwork } from '@/endpoints/networks/CloneNetwork'
import { deleteTestNetworks } from '@/endpoints/networks/DeleteTestNetworks'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useStatesStore } from '@/stores/states'
import { storeToRefs } from 'pinia'

import Dropdown from '@/components/Dropdown.vue'

// stores
const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

// values from store
const orgId = storeToRefs(ids.orgId)
const networkId = storeToRefs(ids.networkId)

const organizationsNotLoaded = ref(true)

// Organizations and networks from API
const organizations = ref([])
const networks = ref([])

// Network selection dropdown options and selected network
const networkOptions = ref([])

interface Network {
  id: string;
  name: string;
}

const selectedNetwork = ref<Network | null>(null)

// New network name and address fields inputs
const newNetworkNameInput = ref('')
const newNetworkAddress = ref('')

// Loading states
const loadingNetworks = ref(false)
const networksLoaded = ref(false)

// UI states
const cloningNetwork = ref(false)
const deletingTestNetworks = ref(false)

const newNameEntered = ref(true)
const newAddressEntered = ref(true)
const newNetworkSelected = ref(true)

// Actions to take once an organization is selected
const setOrganizationOption = async (option: { id: any }) => {
    // 1 - Set the orgId in this and the ids store
    orgId.value = option.id
    ids.setOrgId(option.id)

    // 2 - Load networks for the selected org
    loadingNetworks.value = true
    networks.value = await getNetworks(orgId.value)

    // 3 - Populate network options array and dropdown
    populateNetworkOptions()

    // 4 - update loading states
    networksLoaded.value = true
    loadingNetworks.value = false
}

// Populate network options array
const populateNetworkOptions = () => {
    // map networks to options
    networkOptions.value = networks.value.map(network => {
        return {
            id: network.id,
            name: network.name
        }
    })
}

// Set the selected network
const setNetworkOption = (option: Network | { id: string; name: string }) => {
    selectedNetwork.value = option
    networkId.value = option.id
    newNetworkSelected.value = true
}

// Handle network cloning (when the clone network button is clicked)
const cloneNetworkEvent = async () => {
    // Clone the network with the API
    if (newNetworkNameInput.value === '') {
        newNameEntered.value = false
    }
    if (newNetworkAddress.value === '') {
        newAddressEntered.value = false
    }
    if (selectedNetwork.value === null) {
        newNetworkSelected.value = false
    }
    if (newNameEntered.value === false || newAddressEntered.value === false || newNetworkSelected.value === false) {
        return
    }

    newNameEntered.value = true
    newAddressEntered.value = true
    cloningNetwork.value = true

    const response = await cloneNetwork(selectedNetwork.value, newNetworkNameInput.value, orgId.value)
    if (response) {
        console.log('[SETUP] Cloned network id:', response.newNetworkId)
        // update stores values
        ids.setNewNetworkId(response.newNetworkId)
        devices.setAddress(newNetworkAddress.value)
        devices.setNetwork(newNetworkNameInput.value)
        // update state store to move to the next step
        states.setSetupDone(true)
    } else {
        console.log('[SETUP] Error cloning network')
    }
}

/**
 * Used only for test / debug process
 * Avance direcly to the naming step whilst skipping the cloning and claiming steps
 * We will need to get the devices from the API and set the devices store with them
 */
const configureNetwork = async () => {
    ids.setNewNetworkId(networkId.value)

    let devicesList = await getNetworkDevices(networkId.value)

    console.log('[SETUP] Devices in network: ', devicesList)

    devices.setDevicesList(devicesList)
    // add network name to the devices store
    devices.setNetwork(selectedNetwork.value.name)

    // get the network address from the first device in the list, if there is no device, leave the address empty
    if (devicesList.length > 0) {
        devices.setAddress(devicesList[0].address)
    } else {
        devices.setAddress('')
    }

    // update state store to move to the next step
    states.setSetupDone(true)
    states.setClaimDone(true)
}

// Setup function to run on page load
const setup = async () => {
    // Get organizations from the API
    organizations.value = await getOrganizations()
    if (orgId.value && orgId.value !== '-1') {
        // if an orgId is already set in the root div, set it in the store
        setOrganizationOption({id: orgId.value})
    }
    console.log('[SETUP] Organizations loaded: ', organizations.value)
    organizationsNotLoaded.value = false
};

const deleteTestNetworksEvent = async () => {
    deletingTestNetworks.value = true
    let response = await deleteTestNetworks()
    console.log('[SETUP] Deleted test networks: ', response)
    deletingTestNetworks.value = false
}

// Run setup function on page load
onMounted(()  => {
  setup();
})

</script>

<template>
    <div id="setup-page">
        <h1>Setup</h1>
        <p v-if="organizationsNotLoaded">Loading organizations...</p>
        <template class="make-column" v-if="organizationsNotLoaded === false">
            <div class="margin-padding-all-normal button-top-right">
                <button class="margin-padding-all-normal" @click="deleteTestNetworksEvent">Delete test networks</button>
                <p v-if="deletingTestNetworks">Deleting test networks...</p>
            </div>

            <div class="make-column">
                <h3>Choose an org</h3>
                <Dropdown :options="organizations" @select-option="setOrganizationOption"/>
                <p v-if="loadingNetworks">Loading networks...</p>

                <template v-if="networksLoaded">
                    <h3>Choose a network</h3>
                    <Dropdown :options="networks" @select-option="setNetworkOption"/>
                    <p class="red" v-if="!newNetworkSelected">Please select a newtork to clone</p>

                    <button class="margin-padding-all-normal" @click="configureNetwork">Configure this network</button>

                    <h3>Choose a new network name</h3>
                    <input v-model="newNetworkNameInput" type="text" placeholder="New network name" @input="newNameEntered=true"/>
                    <p class="red" v-if="!newNameEntered">Please enter a new network name</p>

                    <h3>Choose a new network address</h3>
                    <input v-model="newNetworkAddress" type="text" placeholder="New network address" @input="newAddressEntered=true"/>
                    <p class="red" v-if="!newAddressEntered">Please enter a new network address</p>

                    <button class="margin-padding-all-normal" @click="cloneNetworkEvent">Clone network</button>
                    <p v-if="cloningNetwork">Cloning network...</p>
                </template>
            </div>
        </template>
    </div>
</template>

<style scoped>
    .make-column {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .margin-padding-all-normal {
        margin: 10px;
        padding: 10px;
    }

    .button-top-right {
        position: absolute;
        top: 0;
        right: 0;
    }

    .red {
        color: red  ;
    }

    #setup-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 400%;
        position: relative;
    }
</style>
