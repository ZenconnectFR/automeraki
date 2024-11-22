<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { useRoute, useRouter } from 'vue-router'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'

import Card from 'primevue/card'

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
    <div style="margin-top: 60px;">
        <h1>Comments</h1>
        <Card v-for="comment in comments" style="margin-bottom: 30px;">
            <template #title>
                <h2>{{ comment.title }}</h2>
            </template>
            <template #content>
                <p v-for="line in comment.content">{{ line }}</p>
            </template>
        </Card>


        <button @click="router.push(getRoutePath(configStore.prevPage()))">Back</button>
        <button @click="router.push('/rickroll')">Finish</button>
    </div>
</template>