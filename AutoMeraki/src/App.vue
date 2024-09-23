<script setup>

import { ref, onMounted } from 'vue'
import Setup from './Pages/Setup.vue'
import Claim from './Pages/Claim.vue'
import Vlan from './Pages/Vlan.vue'
import { useStatesStore } from '@/Stores/states'
import { useIdsStore } from '@/Stores/ids'
import { storeToRefs } from 'pinia'

const ready = ref(false)

const ids = useIdsStore()

// Check if the orgId is in the root div of the app
const orgId = document.getElementById('app').getAttribute('data-org-id')
if (orgId && orgId !== '-1') {
  ids.$patch({orgId: orgId})
  ready.value = true
} else {
  ready.value = true
}

const states = useStatesStore()

console.log('states', states)

const { setupDone, claimDone, vlanDone } = storeToRefs(states)

</script>

<template>
  <div id="welcome">
    <h1>Welcome to AutoMeraki</h1>
    <template v-if="!setupDone && ready">
      <Setup />
    </template>
    <template v-if="setupDone && !claimDone">
      <Claim />
    </template>
    <template v-if="claimDone && !vlanDone">
      <Vlan />
    </template>
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
