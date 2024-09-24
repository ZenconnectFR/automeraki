<script setup>

import { ref, onMounted } from 'vue'
import Setup from './Pages/Setup.vue'
import Claim from './Pages/Claim.vue'
import Naming from './Pages/Naming.vue'
import { useStatesStore } from '@/Stores/states'
import { useIdsStore } from '@/Stores/ids'
import { storeToRefs } from 'pinia'

// state control to wait for orgId to be set
const ready = ref(false)

// stores
const ids = useIdsStore()
const states = useStatesStore()

// Check if the orgId is in the root div of the app
const orgId = document.getElementById('app').getAttribute('data-org-id')
if (orgId && orgId !== '-1') {
    // set the orgId in the store
    ids.$patch({orgId: orgId})
    // in both cases, set ready to true
    ready.value = true
} else {
    ready.value = true
}

// destructure states
const { setupDone, claimDone, namingDone, vlanDone } = storeToRefs(states)

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
    <template v-if="claimDone && !namingDone">
      <Naming />
    </template>
    <template v-if="namingDone && !vlanDone">
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
