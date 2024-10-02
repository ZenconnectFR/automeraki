<script setup lang="ts">

import { ref, onMounted } from 'vue'
import { getOrganizations } from '@/endpoints/organizations/GetOrganizations'
import { getNetworks } from '@/endpoints/networks/GetNetworks'
import { getNetworkDevices } from '@/endpoints/networks/GetNetworkDevices'
import { cloneNetwork } from '@/endpoints/networks/CloneNetwork'
import { getTemplates } from '@/endpoints/templates/GetTemplates'
import { getTemplateData } from '@/endpoints/templates/GetTemplateData'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import Dropdown from '@/components/Dropdown.vue'

import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// stores
const ids = useIdsStore()
const devices = useDevicesStore()
const configuration = useConfigurationStore()

// values from store
const orgId = storeToRefs(ids.orgId)

orgId.value = '738027388935340172'
const networkId = storeToRefs(ids.networkId)

const organizationsNotLoaded = ref(true)

// Organizations and networks from API
const organizations = ref([])
const networks = ref([])

// Network selection dropdown options and selected network
const networkOptions = ref([])

interface Network {
    name: string;
    value: any;
}

const selectedNetwork = ref<Network | null>(null)

// New network name and address fields inputs
const newNetworkNameInput = ref('')
const newNetworkAddress = ref('')

// Templates
let templates = ref([])
const selectedTemplate = ref({ value: '-1', name: '' })
const newTemplateSelected = ref(false)

// Loading states
const loadingNetworks = ref(false)
const networksLoaded = ref(false)
const templatesLoaded = ref(false)

// UI states
const cloningNetwork = ref(false)

const newNameEntered = ref(true)
const newAddressEntered = ref(true)
const newNetworkSelected = ref(true)

/*
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
*/

interface SelectedOrgOption {
    name: string;
    value: any;
}

const selectedOrgOption = ref(<SelectedOrgOption> { name: '', value: '-1' });

// if selectedOrgOption is modified, set the orgId in the store
const setOrganizationOption = async () => {
    console.log('[SETUP] Selected org option in set org:', selectedOrgOption.value)
    orgId.value = selectedOrgOption.value.value
    ids.setOrgId(selectedOrgOption.value.value)

    // get the templates for the selected org
    getOrgTemplates()

    // get the networks for the selected org
    loadingNetworks.value = true
    networksLoaded.value = false
    networks.value = await getNetworks(orgId.value)
    if (networks.value === undefined) {
        networks.value = []
        console.error('[SETUP] No networks found for org:', orgId.value)
    }
    networksLoaded.value = true
    loadingNetworks.value = false
    populateNetworkOptions()
}

// Populate network options array
const populateNetworkOptions = () => {
    // map networks to options
    networkOptions.value = networks.value.map(network => {
        return {
            value: network.value,
            name: network.name
        }
    })
}

// Set the selected network
const setNetworkOption = (option: Network | { value: string; name: string }) => {
    selectedNetwork.value = option
    networkId.value = option.value
    console.log('[SETUP] Selected network:', selectedNetwork.value)
    newNetworkSelected.value = true
}

// Set the selected template
const setTemplateOption = (option: { value: string; name: string }) => {
    selectedTemplate.value = option
    console.log('[SETUP] Selected template:', selectedTemplate.value)
    newTemplateSelected.value = true
}

const fieldsCheck = () => {
    if (newNetworkNameInput.value === '') {
        newNameEntered.value = false
    }
    if (newNetworkAddress.value === '') {
        newAddressEntered.value = false
    }
    if (newNameEntered.value === false || newAddressEntered.value === false || newNetworkSelected.value === false) {
        return false
    }

    newNameEntered.value = true
    newAddressEntered.value = true
    return true
}

const cloneNetworkAction = async (toCloneId : string) => {
    const response = await cloneNetwork(toCloneId, newNetworkNameInput.value, orgId.value)
    if (response) {
        console.log('[SETUP] Cloned network id:', response.newNetworkId)
        // update stores values
        ids.setNewNetworkId(response.newNetworkId)
        devices.setAddress(newNetworkAddress.value)
        devices.setNetwork(newNetworkNameInput.value)
        // update state store to move to the next step
        router.push('/claim')
    } else {
        console.log('[SETUP] Error cloning network')
    }
}

// Handle network cloning (when the clone network button is clicked)
const cloneNetworkEvent = async () => {
    // Clone the network with the API
    if (!fieldsCheck()) {return}
    if (selectedNetwork.value === null) {
        newNetworkSelected.value = false
        return
    }
    cloningNetwork.value = true

    console.log('[SETUP] Cloning network:', selectedNetwork.value.value, newNetworkNameInput.value, orgId.value)
    cloneNetworkAction(selectedNetwork.value.value)
}

// Continue with the selected template
const continueWithTemplate = async () => {
    if (!fieldsCheck()) {return}

    // get the template payload
    let templateData = await getTemplateData(orgId.value, selectedTemplate.value.value)
    console.log('[SETUP] Template data:', templateData)

    // set the template data in the configuration store
    configuration.setConfiguration(templateData)

    // clone the network contained in the field templateData.networkToClone
    cloningNetwork.value = true

    console.log('[SETUP] Cloning network:', templateData.networkToClone, newNetworkNameInput.value, orgId.value)
    cloneNetworkAction(templateData.networkToClone)
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

    // add template data to the configuration store
    console.log('[SETUP] Getting template data for org:', orgId.value, 'template:', 'default.json')
    let templateData = await getTemplateData(orgId.value, 'default.json')
    console.log('[SETUP] Template data:', templateData)
    configuration.setConfiguration(templateData)

    // update state store to move to the next step
    router.push({ path: '/naming', replace: true })
}

// get templates for an organization
const getOrgTemplates = async () => {
    // get the templates for the selected org
    templatesLoaded.value = false
    // get the templates for the selected org
    templates = await getTemplates(orgId.value)
    console.log('[SETUP] Templates loaded: ', templates)
    templatesLoaded.value = true
    newTemplateSelected.value = true
}

// Setup function to run on page load
const setup = async () => {
    // Get organizations from the API
    let fetchedOrgs = await getOrganizations()
    // turn the fetchedOrgs.id into .value
    organizations.value = fetchedOrgs.map((org: { id: string; name: string }) => {
        return {
            value: org.id,
            name: org.name
        }
    })
    if (orgId.value && orgId.value !== '-1') {
        // if an orgId is already set in the root div, set it in the store
        ids.setOrgId(orgId.value)
        // Make this org the default selected org
        let selectedOrg = organizations.value.find(org => org.value === orgId.value)
        console.log('[SETUP] Selected org at load:', selectedOrg)
        selectedOrgOption.value = { name: selectedOrg.name, value: selectedOrg.value}
        console.log('[SETUP] Selected orgOption at load:', selectedOrgOption.value)
        // get the templates for the selected org
        getOrgTemplates()
    }
    console.log('[SETUP] Organizations loaded: ', organizations.value)
    organizationsNotLoaded.value = false
};

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
            <div class="make-column">
                <h3>Choose an org</h3>
                <Dropdown :options="organizations" v-model="selectedOrgOption" :onSelect="setOrganizationOption"/>
                <p v-if="loadingNetworks">Loading networks...</p>

                <template v-if="templatesLoaded">
                    <h3>Choose a template</h3>
                    <Dropdown :options="templates" v-model="selectedTemplate" :onSelect="setTemplateOption"/>
                    <p v-if="!newTemplateSelected">Please select a template</p>

                    <h3>Choose a new network name</h3>
                    <input v-model="newNetworkNameInput" type="text" placeholder="New network name" @input="newNameEntered=true"/>
                    <p class="red" v-if="!newNameEntered">Please enter a new network name</p>

                    <h3>Choose a new network address</h3>
                    <input v-model="newNetworkAddress" type="text" placeholder="New network address" @input="newAddressEntered=true"/>
                    <p class="red" v-if="!newAddressEntered">Please enter a new network address</p>

                    <button class="margin-padding-all-normal" @click="continueWithTemplate">Continue with this template</button>

                    <template v-if="networksLoaded">
                        <h3>Choose a network</h3>
                        <Dropdown :options="networks" v-model="selectedNetwork" :onSelect="setNetworkOption"/>
                        <p class="red" v-if="!newNetworkSelected">Please select a newtork to clone</p>

                        <div class="make-column">
                            <button class="margin-padding-all-normal" @click="configureNetwork">Configure this network</button>
                            <button class="margin-padding-all-normal" @click="cloneNetworkEvent">Clone network</button>
                        </div>
                        <p v-if="cloningNetwork">Cloning network...</p>
                    </template>
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
