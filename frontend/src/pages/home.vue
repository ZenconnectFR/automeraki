<template>
    <Button icon="pi pi-user" @click="moreOptions = true" label="" class="vpn-btn"/>
    <h1>Welcome to Automeraki</h1>

    <Divider style="width: 250px;"></Divider>

    <Button @click="goToConfig" label="Configure network" />

    <Drawer v-model:visible="moreOptions" header="Your information" position="right" style="width: 400px;">
        <div class="col center">

            <Tag style="margin-top: 25px;" severity="secondary">
                {{ userEmail }}
            </Tag>

            <Button @click="sessionStore.clearSession(); router.push('/')" label="Logout" style="margin-top: 25px;"/>
        </div>
    </Drawer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'

import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'

const router = useRouter()
const sessionStore = useSessionStore()

const moreOptions = ref(false)

const userEmail = ref('')

const parseJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))

        return JSON.parse(jsonPayload)
    } catch (e) {
        return {}
    }
}

const goToConfig = () => {
    router.push('/setup')
}

onMounted(() => {
    if (sessionStore.getIdToken()) {
        const token = parseJwt(sessionStore.getSession())
        userEmail.value = token.sub
    }
})

</script>