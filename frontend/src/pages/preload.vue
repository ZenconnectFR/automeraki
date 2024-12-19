<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { axiosInstance as Axios } from '@/plugins/AxiosInstance';

// Page used to check if the user is logged in and authenticated correctly, if they are, redirect to the home page, else to the login page

import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session';

const sessionStore = useSessionStore()
const router = useRouter()

// first check if the user is logged in
const checkSession = () => {
    if (sessionStore.getIdToken()) {
        // if they are, check if the session is still valid by sending a request to the backend
        Axios.get('/startup')
            .then(() => {
                // if the session is valid, redirect to the home page
                console.log('session is valid')
                router.push('/home')
            })
            .catch((error) => {
                console.log('session is invalid, error:', error)
                // if the session is invalid, empty the session and redirect to the login page and set the query param depending on the error (expired or unauthorized)
                sessionStore.clearSession()
                if (error.response.status === 401) {
                    router.push({ path: '/login', query: { forbidden: 'true' } })
                } else {
                    router.push({ path: '/login', query: { expired: 'true' } })
                }
            })
    } else {
        // if the user is not logged in, redirect to the login page
        router.push('/login')
    }
}

onMounted(() => {
    checkSession()
})

</script>

<template>
    <div>
        <p>Checking session...</p>
    </div>
</template>
