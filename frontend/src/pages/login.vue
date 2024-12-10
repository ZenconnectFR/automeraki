<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useConfigurationStore } from '@/stores/configuration';
import { useSessionStore } from '@/stores/session';
import { storeToRefs } from 'pinia';

import { useRouter, useRoute } from 'vue-router'
import { axiosInstance as Axios } from '@/plugins/AxiosInstance';

import Button from 'primevue/button'
import { Divider } from 'primevue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

const toast = useToast()

const sessionStore = useSessionStore()

const checkLogin = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const login = urlParams.get('login')
    if (login === 'false') {
        toast.add({ severity: 'error', summary: 'Login failed', detail: 'Please try again', life: 3000 })
    } else if (login === 'true') {
        toast.add({ severity: 'success', summary: 'Login successful', detail: 'Welcome', life: 3000 })
    }
}

const checkAuthorization = () => {
    // same but look for "forbidden" set to true, in which case we show a toast saying you don't have access
    const urlParams = new URLSearchParams(window.location.search)
    const forbidden = urlParams.get('forbidden')
    if (forbidden === 'true') {
        toast.add({ severity: 'error', summary: 'Access denied', detail: 'You do not have access to this page', life: 3000 })
    }
    
    // also check for "expired" set to true, in which case we show a toast saying the session has expired
    const expired = urlParams.get('expired')
    if (expired === 'true') {
        toast.add({ severity: 'error', summary: 'Session expired', detail: 'Please login again', life: 3000 })
    }
}

const client_id = '0oa17tl96kdAzHuA70x8'
const redirect_uri = 'http://localhost:5173/login/callback'
const oktaDomain = 'zenconnect.okta.com'


const login = async () => {

    // generate a random string for the state
    let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let state = '';
    for (let i = 0; i < 32; i++) {
        state += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // generate a code verifier
    chars += '-_';
    let codeVerifier = '';
    // variable lenth between 43 and 128
    let length = Math.floor(Math.random() * 85) + 43;
    for (let i = 0; i < length; i++) {
        codeVerifier += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // generate a code challenge (sha256 of the code verifier)
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)

    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    // base64url encoding
    const codeChallenge = btoa(String.fromCharCode.apply(null, hashArray)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    console.log('codeVerifier', codeVerifier)
    console.log('codeChallenge', codeChallenge)

    console.log('state', state)

    // set the state and code verifier in the session
    sessionStore.setStateString(state)
    sessionStore.setCodeVerifier(codeVerifier)

    let oktaAuthEndpoint = `https://${oktaDomain}/oauth2/v1/authorize?client_id=${client_id}&response_type=code&scope=openid profile&redirect_uri=${redirect_uri}&state=${state}`
    oktaAuthEndpoint += `&code_challenge=${codeChallenge}&code_challenge_method=S256`
    window.location.href = oktaAuthEndpoint
}

onMounted(() => {
    checkLogin()
    checkAuthorization()
    login()
})

</script>

<template>
    <Toast position="top-right" />

    <div class="col home">
        <h1>Login with Okta</h1>
        <Divider />
        <Button @click="login" label="Login" />
    </div>
</template>

<style scoped>
.button {
    margin: 10px;
}

.home {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: fixed;
    top: 100px;
}
</style>
