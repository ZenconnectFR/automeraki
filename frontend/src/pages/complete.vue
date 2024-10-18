<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { useRoute, useRouter } from 'vue-router'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const comments = ref([] as any[])

const populateComments = async () => {
    comments.value = config.comments
}

onMounted(() => {
    populateComments()
})
</script>

<template>
    <div>
        <h1>Comments</h1>
        <div v-for="comment in comments" :key="comment">
            <h3>{{ comment.title }}</h3>
            <p v-for="line in comment.content" :key="line"> - {{ line }}</p>
        </div>
        <button @click="router.push(getRoutePath(configStore.prevPage()))">Back</button>
        <button @click="router.push('/rickroll')">Finish</button>
    </div>
</template>