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
import { getNetwork } from '@/endpoints/networks/GetNetwork'

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
// orgId.value = '738027388935340172'

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
const selectedTemplate = ref({ value: 'default.json', name: '' })
const templateNetwork = ref('')

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

    // get the name of the network to clone from the template
    let templateData = await getTemplateData(orgId.value, selectedTemplate.value.value)
    templateNetwork.value = await getNetwork(templateData.networkToClone).then((network) => network.name)

    console.log('[SETUP] Template data:', templateData)

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
const setTemplateOption = async (option: { value: string; name: string }) => {
    selectedTemplate.value = option
    console.log('[SETUP] Selected template:', selectedTemplate.value)
    let templateData = await getTemplateData(orgId.value, selectedTemplate.value.value)
    templateNetwork.value = await getNetwork(templateData.networkToClone).then((network) => network.name)

    newNetworkNameInput.value = templateData.preFilledName

    // console.log('[SETUP] Template data:', templateData)
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

    //

    let associationTable = templateData.actions[0].data.associationTable
    console.log('[SETUP] Association table:', associationTable)
    // give each device their associationId, can break on complex format strings for devices names.
    devicesList.forEach((device: { name: string, model: string}) => {
        // find the associationId in the device name, format string is "{networkName}-{associationName}"

        if (!device.name || device.name.split('-').length < 2) {
            // the naming has not been done yet on this device / network, just skip the associationId part
            return
        }

        let associationName = device.name.split('-')[device.name.split('-').length - 1]
        // remove whitespace from the associationName
        associationName = associationName.replace(/\s/g, '')
        console.log('[SETUP] Device with name:', device.name, 'has associationName:', associationName)
        // we just add both the associationName and id to the device object, and determine its type
        device['associationId'] = associationName;
        device['associationName'] = associationName;
        device['type'] = typeFinder(device.model)
    })

    console.log('[SETUP] Devices with associationId: ', JSON.stringify(devicesList))

    //
    
    devices.setDevicesList(devicesList)

    configuration.setCurrentPageConfig(templateData.actions[0].data)
    configuration.setCurrentPageIndex(0)

    // update state store to move to the next step
    router.push({ path: '/naming', replace: true })
}

// get templates for an organization
const getOrgTemplates = useBoolStates([],[templatesLoaded], async () => {
    // get the templates for the selected org
    templates = await getTemplates(orgId.value)
    console.log('[SETUP] Templates loaded: ', templates)

}, newTemplateSelected);

// go to the voice and spoke page
const goToVpn = async () => {
    // set configuration store
    let templateData = await getTemplateData(orgId.value, selectedTemplate.value.value)

    if (templateData.error) {
        alert('Error getting template data: ' + templateData.error)
        return
    }

    // set the vpn configuration in the configuration store
    // get the action named 'vpn' from the template and set its data in the configuration store
    let vpnAction = templateData.actions.find((action: { type: string }) => action.type === 'vpn')

    configuration.setConfiguration(templateData)
    configuration.setCurrentPageConfig(vpnAction.data)

    router.push({ path: '/voice-and-spoke', replace: true, query: { orgWide: "true" } })
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

    // set the first organization as selected
    if (organizations.value.length > 0) {
        selectedOrgOption.value = organizations.value[0]
    }

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
                    <p v-if="templateNetwork">Network to clone: {{ templateNetwork }}</p>
                    <p class="red" v-if="!newTemplateSelected">Please select a template</p>

                    <h3>Choose a new network name</h3>
                    <input v-model="newNetworkNameInput" type="text" placeholder="New network name" @input="newNameEntered=true"/>
                    <p class="red" v-if="!newNameEntered">Please enter a new network name</p>

                    <h3>Choose a new network address</h3>
                    <input v-model="newNetworkAddress" type="text" placeholder="New network address" @input="newAddressEntered=true"/>
                    <p class="red" v-if="!newAddressEntered">Please enter a new network address</p>

                    <button class="margin-padding-all-normal" @click="continueWithTemplate">Continue with this template</button>
                    <button class="margin-padding-all-normal" @click="goToVpn">Voice and Spoke (debug)</button>
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
        width: 90%;
        position: relative;
    }
</style>
