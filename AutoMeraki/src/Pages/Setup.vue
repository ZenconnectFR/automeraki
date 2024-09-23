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
import { set } from '@vueuse/core'

const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

// values from store
const orgId = storeToRefs(ids.orgId)
const networkId = storeToRefs(ids.networkId)
const address = storeToRefs(devices.address)

const organizations = ref([])
const networks = ref([])
const networkOptions = ref([])
const selectedNetwork = ref({})

const newNetworkNameInput = ref('')
const newNetworkAddress = ref('')

const loadingNetworks = ref(false)
const networksLoaded = ref(false)

const setOrganizationOption = async (option) => {
    orgId.value = option.id
    ids.$patch({orgId: option.id})
    loadingNetworks.value = true
    networks.value = await getNetworks(orgId.value)
    populateNetworkOptions()
    networksLoaded.value = true
    loadingNetworks.value = false
}

const populateNetworkOptions = () => {
  for (const network of Object.values(networks.value)) {
    networkOptions.value.push({
      id : network.id,
      name: network.name
    });
  }
}

const setNetworkOption = (option) => {
  selectedNetwork.value = option
  networkId.value = option.id
  console.log('Selected network:', selectedNetwork.value)
}

const cloneNetworkEvent = async () => {
  const response = await cloneNetwork(selectedNetwork.value, newNetworkNameInput.value, orgId.value)
  if (response) {
    console.log('Cloned network id:', response.newNetworkId)
    ids.$patch({newNetworkId: response.newNetworkId})
    devices.$patch({address: newNetworkAddress.value})
    // we can transition to the next page here
    states.$patch({setupDone: true})
  } else {
    console.log('Error cloning network')
  }
}

const setup = async () => {
  organizations.value = await getOrganizations()
  if (orgId.value && orgId.value !== '-1') {
    setOrganizationOption({id: orgId.value})
  }
};

onMounted(()  => {
  setup();
})



/**
 * Logic:
 * Page has 2 dropdowns: one for organizations and one for networks.
 * If the org is already selected, the org dropdown will have it selected and the networks dropdown will be populated with the networks of the selected org.
 * if the org is not selected, the org dropdown will ask the user to select an org and the networks dropdown will be disabled.
 * In the two cases, the org dropdown will be populated with the list of organizations.
 *
 * Once both an org and a network are selected, the user will be able to clone the network and add devices to it.
 * They will have to first provide a name and address for the new network, then click the clone button.
 */

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
