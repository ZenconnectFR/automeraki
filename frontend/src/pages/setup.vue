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

import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import Divider from 'primevue/divider';
import Popover from 'primevue/popover';


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
const templates = ref([])
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

// debug drawer
const visibleRight = ref(false)
const moreOptions = ref(false)

// help buttons refs
const vpnHelp = ref();
const editNetHelp = ref();


// help button toggles
const toggleVpnHelp = (event) => {
    vpnHelp.value.toggle(event)
}

const toggleEditNetHelp = (event) => {
    editNetHelp.value.toggle(event)
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

// if selectedOrgOption is modified, set the orgId in the store
const setOrganizationOption = async () => {
    console.log('[SETUP] Selected org option in set org:', selectedOrgOption.value)
    if (orgId.value === selectedOrgOption.value.value && templatesLoaded.value && networksLoaded.value) {
        return
    }

    templatesLoaded.value = false

    orgId.value = selectedOrgOption.value.value
    ids.setOrgId(selectedOrgOption.value.value)

    // get the templates for the selected org
    getOrgTemplates()

    // get the name of the network to clone from the template
    let templateData = await getTemplateData(orgId.value, selectedTemplate.value.value)

    // set new network name and address to the pre-filled values from the template
    newNetworkNameInput.value = templateData.preFilledName

    templatesLoaded.value = true

    templateNetwork.value = await getNetwork(templateData.networkToClone).then((network) => network.name)

    console.log('[SETUP] Template data:', templateData)

    await useBoolStates([loadingNetworks], [networksLoaded], async () => {
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

    console.log('[SETUP] Network options:', networkOptions.value)
}

// Set the selected network
const setNetworkOption = () => {
    networkId.value = selectedNetwork.value.value
    console.log('[SETUP] Selected network:', selectedNetwork.value)
    newNetworkSelected.value = true
}

// Set the selected template
const setTemplateOption = async () => {
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
const cloneNetworkAction = async (toCloneId : string, templateData: any) => {
    const response = await cloneNetwork(toCloneId, newNetworkNameInput.value, orgId.value)
    if (response) {
        console.log('[SETUP] Cloned network id:', response.newNetworkId)
        // update stores values
        ids.setNewNetworkId(response.newNetworkId)
        devices.setAddress(newNetworkAddress.value)
        devices.setNetwork(newNetworkNameInput.value)
        configuration.setConfiguration(templateData)
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
    ids.setOrgId(orgId.value)

    // clone the network contained in the field templateData.networkToClone
    cloningNetwork.value = true

    console.log('[SETUP] Cloning network:', templateData.networkToClone, newNetworkNameInput.value, orgId.value)
    await cloneNetworkAction(templateData.networkToClone, templateData)

    // debug: just wait for 2s, put back cloningNetwork to false, wait 1s and mush router to /claim

    /*
    setTimeout(() => {
        cloningNetwork.value = false
    }, 2000)

    setTimeout(() => {
        configuration.setConfiguration(templateData)
        router.push('/claim')
    }, 3000)
    */
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

    configuration.setCurrentPageConfig(templateData.actions.find((action: { type: string }) => action.type === 'naming').data)
    configuration.setCurrentPageIndex(templateData.actions.findIndex((action: { type: string }) => action.type === 'naming'))

    ids.setOrgId(orgId.value)

    // update state store to move to the next step
    router.push({ path: '/naming', replace: true })
}

// get templates for an organization
const getOrgTemplates = useBoolStates([],[templatesLoaded], async () => {
    // get the templates for the selected org
    templates.value = await getTemplates(orgId.value)
    console.log('[SETUP] Templates loaded: ', templates)

    // set the template to either: one of the fetched templates that is called 'default.json' or the first template
    let defaultTemplate = templates.value.find((template: { value: string }) => template.value === 'default.json')
    console.log('[SETUP] Default template:', defaultTemplate)
    if (defaultTemplate) {
        selectedTemplate.value = defaultTemplate
    } else {
        selectedTemplate.value = templates[0]
    }

}, newTemplateSelected);

// go to the voice and spoke page
const goToVpn = async () => {
    // set configuration store values
    let templateData = await getTemplateData(orgId.value, selectedTemplate.value.value)

    if (templateData.error) {
        alert('Error getting template data: ' + templateData.error)
        return
    }

    console.log('[SETUP] orgId when going to vpn:', orgId.value)
    // set the orgId in the store just in case
    ids.setOrgId(orgId.value)

    // set the vpn configuration in the configuration store
    // get the action named 'vpn' from the template and set its data in the configuration store
    let vpnAction = templateData.actions.find((action: { type: string }) => action.type === 'vpn')

    configuration.setConfiguration(templateData)
    configuration.setCurrentPageConfig(vpnAction.data)

    router.push({ path: '/voice-and-spoke', replace: true, query: { orgWide: "true" } })
}

const goToEditNames = async () => {
    // Go to the edit network names page, store the orgId and networkId in the store
    ids.setOrgId(orgId.value)
    ids.setNetworkId(networkId.value)

    router.push('/edit-network')
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

    console.log('[SETUP] orgId at load:', orgId.value)

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
        ids.setOrgId(organizations.value[0].value)
        setOrganizationOption()
    }

    organizationsNotLoaded.value = false

    // empty store values if set 
    ids.setNewNetworkId('')
    ids.setNetworkId('')
    ids.setOrgId('')

    devices.setDevicesList([])
    devices.setNetwork('')
    devices.setAddress('')

    configuration.setConfiguration({})
};

// Run setup function on page load
onMounted(()  => {
  setup();
})

</script>

<template>
    <!-- button to show more options, plus icon -->
    <Button icon="pi pi-chevron-left" @click="visibleRight = false; moreOptions = true" label="More" class="vpn-btn"/>

    <Button icon="pi pi-chevron-left" @click="visibleRight = true; moreOptions = false" label="Debug" class="debug-btn"/>

    <Drawer v-model:visible="moreOptions" header="Extra features" position="right" style="width: 400px;">
        <Divider />
        <div class="col" style="justify-content: center; align-items: center;">
            <span class="pi pi-question-circle" @click="toggleVpnHelp" style="align-self: flex-end;"></span>
            <h3 style="margin-right: 10px;">Vpn subnets</h3>
            <Popover ref="vpnHelp" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                <p>Consult the next available networks for the Spoke mode VPN in this organization</p>
            </Popover>

            <Button @click="goToVpn" label="Voice and Spoke" class="margin-all-normal" :disabled="!templatesLoaded"/>
        </div>

        <Divider />
        <div class="col" style="justify-content: center; align-items: center;">
            <span class="pi pi-question-circle" @click="toggleEditNetHelp" style="align-self: flex-end;"></span>
            <h3>Edit network</h3>
            <Popover ref="editNetHelp" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                <p>Edit the name of all the devices in a network at once</p>
            </Popover>
            <Select v-model="selectedNetwork" :options="networkOptions" optionLabel="name" @change="setNetworkOption"
                checkmark :highlightOnSelect="false" filter placeholder="Select a Network" class="dropdown"
                :disabled="!networksLoaded"/>

            <Button @click="goToEditNames" label="Edit network devices names" class="margin-all-normal" :disabled="!templatesLoaded"/>
        </div>
    </Drawer>

    <Drawer v-model:visible="visibleRight" header="Edit network" position="right" style="width: 400px;">
        <Divider />

        <Select v-model="selectedNetwork" :options="networkOptions" optionLabel="name" @change="setNetworkOption"
            checkmark :highlightOnSelect="false" filter placeholder="Select a Network" class="dropdown"
            :disabled="!networksLoaded"/>

        <Message severity="error" size="small" variant="simple" v-if="!newNetworkSelected">Please select a network to clone</Message>
        
        <Button class="margin-all-normal constant-width-250 constant-height-40" @click="configureNetwork"
            :disabled="!networksLoaded">
            Configure this network
        </Button>
    </Drawer>

    <div id="setup-page">
        <h1>Setup</h1>

        <Divider style="width: 250px;" />

        <v-progress-circular v-if="organizationsNotLoaded" indeterminate color="primary"></v-progress-circular>

        <Select v-model="selectedOrgOption" :options="organizations" optionLabel="name" @change="setOrganizationOption"
            checkmark :highlightOnSelect="false" filter placeholder="Select an Organization" class="dropdown"
            v-if="!organizationsNotLoaded"/>

        <Select v-model="selectedTemplate" :options="templates" optionLabel="name" @change="setTemplateOption"
            checkmark :highlightOnSelect="false" filter placeholder="Select a Template" :disabled="!templatesLoaded" class="dropdown"
            v-if="!organizationsNotLoaded"/>

        <p v-if="templateNetwork">Network to clone: {{ templateNetwork }}</p>

        <br>

        <InputText v-model="newNetworkNameInput" placeholder="New network name" @input="newNameEntered=true"
            class="bigger-input" :disabled="organizationsNotLoaded && !templatesLoaded"/>

        <Message severity="error" size="small" variant="simple" v-if="!newNameEntered">Please enter a new network name</Message>

        <br>

        <InputText v-model="newNetworkAddress" placeholder="New network address" @input="newAddressEntered=true"
            class="bigger-input" :disabled="organizationsNotLoaded && !templatesLoaded"/>

        <Message severity="error" size="small" variant="simple" v-if="!newAddressEntered">Please enter a new network address</Message>

        <br>

        <Button class="margin-all-normal constant-width-250 constant-height-40" @click="continueWithTemplate"
            :disabled="(organizationsNotLoaded && !templatesLoaded) || cloningNetwork">
            <v-progress-circular v-if="cloningNetwork" indeterminate color="#fff" width="3"></v-progress-circular>
            <span v-else>Continue with this template</span>
        </Button>
    </div>
</template>

<style scoped>
    .make-column {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .margin-all-normal {
        margin: 10px;
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
        width: 100%;
        position: fixed;
        top: 100px;
    }
</style>
