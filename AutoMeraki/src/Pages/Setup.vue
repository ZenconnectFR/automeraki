<script setup>

import { ref, onMounted } from 'vue'
import { getOrganizations } from '../Endpoints/Organization/GetOrganizations.vue'
import { getNetworks } from '../Endpoints/Networks/GetNetworks.vue'
import { cloneNetwork } from '../Endpoints/Networks/CloneNetwork.vue'
import { useIdsStore } from '@/Stores/ids'
import { useDevicesStore } from '@/Stores/devices'
import { useStatesStore } from '@/Stores/states'
import { storeToRefs } from 'pinia'

import Dropdown from '../Components/Dropdown.vue'

// stores
const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

// values from store
const orgId = storeToRefs(ids.orgId)
const networkId = storeToRefs(ids.networkId)

// Organizations and networks from API
const organizations = ref([])
const networks = ref([])

// Network selection dropdown options and selected network
const networkOptions = ref([])
const selectedNetwork = ref({})

// New network name and address fields inputs
const newNetworkNameInput = ref('')
const newNetworkAddress = ref('')

// Loading states
const loadingNetworks = ref(false)
const networksLoaded = ref(false)

// Actions to take once an organization is selected
const setOrganizationOption = async (option) => {
    // 1 - Set the orgId in this and the ids store
    orgId.value = option.id
    ids.$patch({orgId: option.id})

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
    for (const network of Object.values(networks.value)) {
        networkOptions.value.push({
            id : network.id,
            name: network.name
        });
    }
}

// Set the selected network
const setNetworkOption = (option) => {
    selectedNetwork.value = option
    networkId.value = option.id
}

// Handle network cloning (when the clone network button is clicked)
const cloneNetworkEvent = async () => {
    // Clone the network with the API
    const response = await cloneNetwork(selectedNetwork.value, newNetworkNameInput.value, orgId.value)
    if (response) {
        console.log('[SETUP] Cloned network id:', response.newNetworkId)
        // update stores values
        ids.$patch({newNetworkId: response.newNetworkId})
        devices.$patch({address: newNetworkAddress.value})
        devices.$patch({network: newNetworkNameInput.value})
        // update state store to move to the next step
        states.$patch({setupDone: true})
    } else {
        console.log('[SETUP] Error cloning network')
    }
}

// Setup function to run on page load
const setup = async () => {
    // Get organizations from the API
    organizations.value = await getOrganizations()
    if (orgId.value && orgId.value !== '-1') {
        // if an orgId is already set in the root div, set it in the store
        setOrganizationOption({id: orgId.value})
    }
};

// Run setup function on page load
onMounted(()  => {
  setup();
})

</script>

<template>
    <div id="setup-page">
        <h1>Setup</h1>
        <p v-if="organizations.length === 0">Loading organizations...</p>
        <template v-if="organizations.length > 0">
            <h3>Choose an org</h3>
            <Dropdown :options="organizations" @select-option="setOrganizationOption"/>
            <p v-if="loadingNetworks">Loading networks...</p>
            <template v-if="networksLoaded">
                <h3>Choose a network</h3>
                <Dropdown :options="networks" @select-option="setNetworkOption"/>
                <h3>Choose a new network name</h3>
                <input v-model="newNetworkNameInput" type="text" placeholder="New network name"/>
                <h3>Choose a new network address</h3>
                <input v-model="newNetworkAddress" type="text" placeholder="New network address"/>
                <button @click="cloneNetworkEvent">Clone network</button>
            </template>
        </template>
    </div>
</template>

<style scoped>
</style>
