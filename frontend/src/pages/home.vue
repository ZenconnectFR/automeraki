<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useConfigurationStore } from '@/stores/configuration';

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const configuration = useConfigurationStore()

const goToManage = () => {
    router.push('/manage')
}

const goToConfig = () => {
    router.push('/setup')
}

</script>

<template>
    <div>
        <h1>Home</h1>
        <button @click="goToManage">Manage templates</button>
        <button @click="goToConfig">Configure a network</button>
    </div>
</template>

<style scoped>
  div {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, 'BlinkMacSystemFont', Segoe UI, 'Roboto', sans-serif;
  }

  h1 {
    color: #333;
    font-size: 2.2rem;
  }

  button {
    background-color: #4CAF50; 
    color: white;
    padding: 10px 20px;
    margin: 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: background-color 0.3s ease;
    font-family: 'Inter', -apple-system, 'BlinkMacSystemFont', Segoe UI, 'Roboto', sans-serif;
  }

  button:hover {
    background-color: #45a049;
  }

  button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.5);
  }
</style>

