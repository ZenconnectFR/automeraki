<template>
    <v-progress-circular
        v-if="loading"
        indeterminate
        color="primary"
    ></v-progress-circular>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Axios from 'axios'

import { useSessionStore } from '@/stores/session';

const session = useSessionStore()

const router = useRouter()
const loading = ref(true)

router.beforeEach((to, from, next) => {
    loading.value = true
    next()
})

router.afterEach((to, from) => {
    loading.value = false
})

const oktaDomain = 'zenconnect.okta.com'

const verifyState = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const state = urlParams.get('state')

    if (state !== session.getStateString()) {
        console.error('State does not match: state', state, 'session', session.getStateString())
        return false
    }
    return true
}

const getCode = async () => {
    // extract the code from the URL (query param 'code')
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    console.log('code', code)
    
    if (code) {
        console.log('retreiveToken')
        const data = await retreiveToken(code)
        console.log('data', data)
        session.setSession(data.access_token)
        session.setIdToken(data.id_token)

        router.push({ path: '/', query: { login: 'true' } })
    } else {
        // redirect to / with query param login=false
        router.push({ path: '/', query: { login: 'false' } })
    }
}

const retreiveToken = async (code: string) => {
    const data = {
        grant_type: 'authorization_code',
        code: code,
        // redirect_uri is this host + /login/callback (obtained dynamically)
        redirect_uri: `${window.location.protocol}//${window.location.host}/login/callback`,
        client_id: '0oa17tl96kdAzHuA70x8',
        code_verifier: session.getCodeVerifier()
    }

    try {
        const resp = await Axios.post(`https://${oktaDomain}/oauth2/v1/token`, data,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }
        )

        return resp.data
    } catch (error) {
        console.error(error)
        router.push({ path: '/', query: { login: 'false' } })
    }
}

onMounted(() => {
    try {
        if (verifyState()) {
            getCode()
        } else {
            router.push({ path: '/', query: { login: 'false' } })
        }
    } catch (error) {
        console.error(error)
        router.push({ path: '/', query: { login: 'false' } })
    }
})

</script>