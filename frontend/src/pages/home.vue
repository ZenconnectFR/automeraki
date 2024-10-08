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

const goToVoiceAndSpoke = () => {
    router.push('/voice-and-spoke')
}

</script>

<template>
    <div>
        <h1>Home</h1>
        <button @click="goToManage">Manage templates</button>
        <button @click="goToConfig">Configure a network</button>
        <button @click="goToVoiceAndSpoke">Voice and Spoke</button>
    </div>
</template>
