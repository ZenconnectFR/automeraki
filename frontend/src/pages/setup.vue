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

import { useBoolStates } from '@/utils/Decorators'

import Dropdown from '@/components/Dropdown.vue'

import { useRoute, useRouter } from 'vue-router'

// interfaces

interface Option {
    name: string;
    value: any;
}

const router = useRouter()
const route = useRoute()

// stores
const ids = useIdsStore()
const devices = useDevicesStore()
const configuration = useConfigurationStore()

// values from store
const orgId = storeToRefs(ids.orgId)
const networkId = storeToRefs(ids.networkId)

// for tests
orgId.value = '738027388935340172'

const organizationsNotLoaded = ref(true)

// Organizations and networks from API
const organizations = ref([])
const networks = ref([])

// Network selection dropdown options and selected network
const networkOptions = ref([])

const selectedNetwork = ref<Option | null>(null)

// New network name and address fields inputs
const newNetworkNameInput = ref('')
const newNetworkAddress = ref('')

// Templates
let templates = ref([])
const selectedTemplate = ref({ value: '-1', name: '' })

// Loading states
const loadingNetworks = ref(false)
const networksLoaded = ref(false)
const templatesLoaded = ref(false)

// UI states
const cloningNetwork = ref(false)

// Validation states
const newNameEntered = ref(true)
const newAddressEntered = ref(true)
const newNetworkSelected = ref(true)
const newTemplateSelected = ref(true)

const selectedOrgOption = ref(<Option> { name: '', value: '-1' });

// if selectedOrgOption is modified, set the orgId in the store
const setOrganizationOption = async () => {
    console.log('[SETUP] Selected org option in set org:', selectedOrgOption.value)
    if (orgId.value === selectedOrgOption.value.value && templatesLoaded.value && networksLoaded.value) {
        return
    }

    orgId.value = selectedOrgOption.value.value
    ids.setOrgId(selectedOrgOption.value.value)

    // get the templates for the selected org
    getOrgTemplates()

    // get the networks for the selected org
    /*
    loadingNetworks.value = true
    networksLoaded.value = false

    networks.value = await getNetworks(orgId.value)
    if (networks.value === undefined) {
        networks.value = []
        console.error('[SETUP] No networks found for org:', orgId.value)
    }

    networksLoaded.value = true
    loadingNetworks.value = false
    */

    // refactor the previous part with decorators
    useBoolStates([loadingNetworks], [networksLoaded], async () => {
        networks.value = await getNetworks(orgId.value)
        if (networks.value === undefined) {
            networks.value = []
            console.error('[SETUP] No networks found for org:', orgId.value)
        }
    })();

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
const setNetworkOption = (option: Option | { value: string; name: string }) => {
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

// Check if all fields are filled
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

// The function that calls the clone network endpoint
const cloneNetworkAction = async (toCloneId : string) => {
    const response = await cloneNetwork(toCloneId, newNetworkNameInput.value, orgId.value)
    if (response) {
        console.log('[SETUP] Cloned network id:', response.newNetworkId)
        // update stores values
        ids.setNewNetworkId(response.newNetworkId)
        devices.setAddress(newNetworkAddress.value)
        devices.setNetwork(newNetworkNameInput.value)
        // automatically move to the next step
        router.push('/claim')
    } else {
        console.log('[SETUP] Error cloning network')
    }
}

// Handle network cloning (when the clone network button is clicked)
const cloneNetworkEvent = async () => {
    if (selectedNetwork.value === null) {
        newNetworkSelected.value = false
        return
    }

    if (!fieldsCheck()) {return}

    cloningNetwork.value = true

    console.log('[SETUP] Cloning network:', selectedNetwork.value.value, newNetworkNameInput.value, orgId.value)
    cloneNetworkAction(selectedNetwork.value.value)
}

// Continue with the selected template
const continueWithTemplate = async () => {
    if (selectedTemplate.value.name == '') {
        newTemplateSelected.value = false
        return
    }

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
const getOrgTemplates = useBoolStates([],[templatesLoaded], async () => {
    // get the templates for the selected org
    templates = await getTemplates(orgId.value)
    console.log('[SETUP] Templates loaded: ', templates)

}, newTemplateSelected);

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

    // orgId is set by App.vue if the app is contained in meraki, else it defaults to -1
    if (orgId.value && orgId.value !== '-1') {
        ids.setOrgId(orgId.value)

        let selectedOrg = organizations.value.find(org => org.value === orgId.value)
        console.log('[SETUP] Selected org at load:', selectedOrg)

        selectedOrgOption.value = { name: selectedOrg.name, value: selectedOrg.value}
        console.log('[SETUP] Selected orgOption at load:', selectedOrgOption.value)

        // get the templates for the selected org
        setOrganizationOption()
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
                    <p class="red" v-if="!newTemplateSelected">Please select a template</p>

                    <h3>Choose a new network name</h3>
                    <input v-model="newNetworkNameInput" type="text" placeholder="New network name" @input="newNameEntered=true"/>
                    <p class="red" v-if="!newNameEntered">Please enter a new network name</p>

                    <h3>Choose a new network address</h3>
                    <input v-model="newNetworkAddress" type="text" placeholder="New network address" @input="newAddressEntered=true"/>
                    <p class="red" v-if="!newAddressEntered">Please enter a new network address</p>

                    <button class="margin-padding-all-normal" @click="continueWithTemplate">Continue with this template</button>
                    <hr />
                    <h3>Or</h3>
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
    /* Page Setup */
    #setup-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        position: relative;
    }

    h1 {
        font-size: 2rem;
        color: #333;
        margin-bottom: 20px;
    }

    h3 {
        font-size: 1.2rem;
        color: #555;
        margin-bottom: 10px;
    }

    /* Loading and Error Text */
    .loading-text {
        font-size: 1rem;
        color: #999;
        margin-bottom: 20px;
    }

    .error-text {
        color: #ff4d4d;
        font-size: 0.9rem;
        margin-top: 5px;
    }

    /* Form Layout */
    .make-column {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
    }

    .form-group {
        margin-bottom: 20px;
        width: 100%;
    }

    input[type="text"] {
        width: 100%;
        padding: 10px;
        margin-top: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        color: #333;
    }

    /* Buttons */
    .margin-padding-all-normal {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 10px 0;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
    }

    .margin-padding-all-normal:hover {
        background-color: #45a049;
    }

    .button-top-right {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: #f44336;
        color: white;
        padding: 10px;
        border-radius: 50%;
        cursor: pointer;
    }

    /* Separators */
    hr {
        width: 100%;
        border: 1px solid #ddd;
        margin: 20px 0;
    }
</style>
