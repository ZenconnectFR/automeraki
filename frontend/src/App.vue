<script setup lang="ts">

import { ref } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { RouterView, useRouter } from 'vue-router'

import { useErrorStore } from '@/stores/error'
import NavBar from './components/NavBar.vue';

const error = useErrorStore()

const removeErr = (index: number) => {
  console.log('removing error')
  error.removeError(index)
}

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

// check if the user is on the home page
const showNavBar = ref(false)

// listen for route changes
const router = useRouter()
router.afterEach((to, from) => {
  // show navbar if: 
  // - user not in home page
  // - user not in voice-and-spoke with query param orgWide=true
  if (to.path !== '/' && !(to.path === '/voice-and-spoke' && to.query.orgWide === 'true')) {
    showNavBar.value = true
  } else {
    showNavBar.value = false
  }
})


</script>

<template>
  <div id="welcome">
    <div>
      <v-container class="alerts-container">
        <div v-for="(err, index) in error.errors" :key="index" type="error" class="alert-popup" @click:close="removeErr(index)">
          <v-alert color="error" closable>
            {{ err }}
          </v-alert>
        </div>
      </v-container>
    </div>
    <NavBar v-if="showNavBar"/>
    <div v-if="!showNavBar" class="make-space">
    </div>
    <RouterView />
  </div>
</template>

<style scoped>
#welcome {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.alert-popup {
  width: 100%; /* Make alert take up full width of the container */
  margin-top: 10px; /* Space between stacked alerts */
  display: flex;
  justify-content: center; /* Horizontally center content */
  align-items: center; /* Vertically center content */
}

.alerts-container {
  position: fixed;
  top: 10px; /* Start at the top */
  left: 25%; /* Start from the center */
  /*transform: translateX(-50%); /* Center the alerts */
  width: 50%; /* Take 50% of the page width */
  z-index: 9999; /* Ensure it's above other elements */
  display: flex;
  flex-direction: column-reverse; /* Most recent at the top */
  align-items: center;
  justify-content: center;
}

.close-btn {
  margin-left: 16px;
  margin-right: 16px;
  color: red; /* Customize the close button color if needed */
  justify-self: flex-end; /* Align the close button to the right */
}

.make-space {
  height: 60px;
}
</style>
