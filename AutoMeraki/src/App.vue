<script setup>

// Get the organization ID, first we try to get it from the window.dataLayer object
// if not present, prompt the user to enter it

// Get the list of networks for the organization

/*
const networks = ref([])

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
const newNetworkAdress = ref('')

const newNetworkId = ref('')
const newNetworkName = ref('')

const cloneNetworkEvent = async () => {
  const response = await cloneNetwork(selectedNetwork.value, newNetworkNameInput.value, orgId.value)
  if (response) {
    newNetworkId.value = response.newNetworkId
    newNetworkName.value = response.newNetworkName
  } else {
    console.log('Error cloning network')
  }
}

const newNetworkDevices = ref('')

const addDevices = async () => {
  const response = await ClaimDevices(newNetworkId.value, newNetworkDevices.value)
  if (response) {
    console.log('Devices added to network', response)
  } else {
    console.log('Error adding devices to network')
  }
}

const setup = async () => {
  networks.value = await getNetworks(orgId.value)
  populateNetworkOptions()
}

onMounted(()  => {
  setup();
})

----------------
<div id="welcome">
  <h1>Welcome to AutoMeraki</h1>
  <template v-if="orgId === '-1'">
    <Dropdown :options="organizationOptions" @select-option="setOrganizationOptions" />
  </template>
  <template v-if="orgId !== '-1'">
    <p>Organization ID: {{ orgId }}</p>
    <Dropdown :options="networkOptions" @select-option="setNetworkOption" />
  </template>
  <p v-if="selectedNetwork.name">Selected Network: {{ selectedNetwork.name }}</p>
  <input v-if="selectedNetwork.name" v-model="newNetworkNameInput" type="text" placeholder="Enter new network name" />
  <input v-if="selectedNetwork.name" v-model="newNetworkAdress" type="text" placeholder="Enter new network address" />
  <button v-if="selectedNetwork.name" @click="cloneNetworkEvent">Clone Network</button>
  <p v-if="newNetworkId">New Network ID: {{ newNetworkId }}</p>
  <p v-if="newNetworkName">New Network Name: {{ newNetworkName }}</p>
  <p v-if="newNetworkAdress">New Network Address: {{ newNetworkAdress }}</p>
  <textarea v-if="newNetworkId" v-model="newNetworkDevices" placeholder="Enter new network devices serials"></textarea>
  <button v-if="newNetworkId" @click="addDevices">Add Devices</button>
</div>
----------------

*/

// ---------------------------------------------------

/**
 * Structure for the project :
 * Main page (this) : Will allow to navigate to the different pages which will be components
 * For now, only 3 pages will be implemented: Setup, Claim, and Vlan
 * Pages :
 * - Setup : page 1/3, sets up the organization and network to copy from, choose the name and address of the new network
 * - Claim : page 2/3, Asks the user to enter the serials of the devices to claim, claims them to the new network on confirmation
 * - Vlan : page 3/3, Shows the vlan configuration of the new network, the configuration can be edited and saved
 *
 * The pages will be components that will be displayed in the main page. Here we will implement the navigation between the pages.
 */



</script>

<template>
  <div id="welcome">
    <h1>Welcome to AutoMeraki</h1>
    <p>We are refactoring the project to avoid having too many modifications to do in the future.<br>
    Come back later !</p>
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
