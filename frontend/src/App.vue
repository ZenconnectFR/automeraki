<script setup>

import { ref } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { RouterView } from 'vue-router'

// state control to wait for orgId to be set
const ready = ref(false)

// stores
const ids = useIdsStore()

// Check if the orgId is in the root div of the app
const orgId = document.getElementById('app').getAttribute('data-org-id')
if (orgId && orgId !== '-1') {
  // set the orgId in the store
  ids.$patch({ orgId: orgId })
  // in both cases, set ready to true
  ready.value = true
} else {
  ready.value = true
}


</script>

<template>
  <div id="welcome">
    <h1>AutoMeraki</h1>
    <RouterView />
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
  width: 100%;
}
</style>
