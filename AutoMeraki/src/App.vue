<script setup>
import {ref, onMounted } from 'vue'
import Dropdown from './components/Dropdown.vue'
import Axios from 'axios'

const orgId = ref('')

// get the orgId from the window.dataLayer object
if (window.dataLayer) {
  const orgIdData = window.dataLayer.find((data) => data.organizationId)
  if (orgIdData) {
    orgId.value = orgIdData.organizationId
  } else {
    console.log('No organizationId found in the dataLayer object');
    orgId.value = '-1';
  }
} else {
  orgId.value = '738027388935340172';
}

// Get the list of networks for the organization


const networks = ref([])

// Get the list of networks for the organization
const getNetworks = async () => {
  try {
    const response = await Axios.get(`http://localhost:8000/networks/${orgId.value}`)
    networks.value = response.data
  } catch (error) {
    console.error(error)
  }
}

// Populate the network options for the dropdown
const networkOptions = ref([])

const populateNetworkOptions = () => {
  for (const network of Object.values(networks.value)) {
    networkOptions.value.push({
      id : network.id,
      name: network.name
    });
  }
}

const selectedNetwork = ref({})

// Set the selected network
const setNetworkOption = (option) => {
  selectedNetwork.value = option
}

const newNetworkNameInput = ref('')

const newNetworkId = ref('')
const newNetworkName = ref('')

const cloneNetwork = async () => {
  if (!selectedNetwork.value.id) {
    console.log('No network selected')
    return
  }
  if (!newNetworkNameInput.value) {
    console.log('No new network name entered')
    return
  }
  console.log('Cloning network with body: id: ', selectedNetwork.value.id, ' name: ', newNetworkNameInput.value)
  try {
    const response = await Axios.post(`http://localhost:8000/networks/clone`, {
      network_id: selectedNetwork.value.id,
      name: newNetworkNameInput.value,
      org_id: orgId.value
    })
    newNetworkId.value = response.data.id
    newNetworkName.value = response.data.name
  } catch (error) {
    console.error(error)
  }
}

const setup = async () => {
  await getNetworks()
  populateNetworkOptions()
}

onMounted(()  => {
  setup();
})

</script>

<template>
  <div id="welcome">
    <h1>Welcome to AutoMeraki</h1>
    <p>Organization ID: {{ orgId }}</p>
    <Dropdown :options="networkOptions" @select-option="setNetworkOption" />
    <p v-if="selectedNetwork.name">Selected Network: {{ selectedNetwork.name }}</p>
    <input v-if="selectedNetwork.name" v-model="newNetworkNameInput" type="text" placeholder="Enter new network name" />
    <button v-if="selectedNetwork.name" @click="cloneNetwork">Clone Network</button>
    <p v-if="selectedNetwork.name">Input is {{ newNetworkNameInput }}</p>
    <p v-if="newNetworkId">New Network ID: {{ newNetworkId }}</p>
    <p v-if="newNetworkName">New Network Name: {{ newNetworkName }}</p>
  </div>
</template>

<style scoped>
#welcome {
  text-align: center;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
