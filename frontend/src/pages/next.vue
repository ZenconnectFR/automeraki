<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { getRoutePath } from '@/utils/PageRouter'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const configStore = useConfigurationStore()

const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

onMounted(() => {
    router.push(getRoutePath(configStore.nextPage()))
})
</script>

<template>
    <div>
        <h1>Redirecting...</h1>
    </div>
</template>

<style scoped>
</style>