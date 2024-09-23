<script setup>
import { ref, onMounted } from 'vue'
import { ClaimDevices } from '../Endpoints/Devices/ClaimDevices.vue'
import { useIdsStore } from '@/Stores/ids'
import { useDevicesStore } from '@/Stores/devices'
import { useStatesStore } from '@/Stores/states'
import { storeToRefs } from 'pinia'

const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

const { newNetworkId } = storeToRefs(ids)
console.log('newNetworkId', newNetworkId)

const newNetworkDevices = ref('')

const addDevices = async () => {
  const response = await ClaimDevices(newNetworkId.value, newNetworkDevices.value)
  if (response) {
    console.log('Devices added to network', response)
    states.$patch({claimDone: true})
  } else {
    console.log('Error adding devices to network')
  }
}
</script>

<template>
    <div id="claim page">
        <h1>Claim Devices</h1>
        <div id="claim-devices-form">
            <textarea v-if="newNetworkId" v-model="newNetworkDevices" placeholder="Enter new network devices serials"></textarea>
            <button v-if="newNetworkId" @click="addDevices">Add Devices</button>
        </div>
    </div>
</template>

<style scoped>

</style>
