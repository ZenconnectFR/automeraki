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
  console.log('No dataLayer object found, setting to default orgId');
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
  let i = 1;
  for (const network of Object.values(networks.value)) {
    console.log(network.name)
    networkOptions.value.push({
      id : i++,
      name: network.name
    });
  }
}

const setup = async () => {
  await getNetworks()
  populateNetworkOptions()
  console.log(networkOptions.value)
}

onMounted(()  => {
  setup();
})

</script>

<template>
  <div id="welcome">
    <h1>Welcome to AutoMeraki</h1>
    <p>Organization ID: {{ orgId }}</p>
    <Dropdown :options="networkOptions" />
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
