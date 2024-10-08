import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'


// Try to move this part to a separate file in the future if possible
import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/pages/home.vue'
import Setup from '@/pages/setup.vue'
import Claim from '@/pages/claim.vue'
import Naming from '@/pages/naming.vue'
import Vlan from '@/pages/vlan.vue'
import Ports from '@/pages/ports.vue'
import FixedIp from './pages/fixedIp.vue';
import Wans from './pages/wans.vue';
import voiceAndSpoke from './pages/voiceAndSpoke.vue';

const routes = [
    { path: '/', component: Home},
    { path: '/setup', component: Setup },
    { path: '/claim', component: Claim },
    { path: '/naming', component: Naming },
    { path: '/vlan', component: Vlan },
    { path: '/ports', component: Ports },
    { path: '/fixed-ip', component: FixedIp},
    { path: '/wans', component: Wans},
    { path: '/voice-and-spoke', component: voiceAndSpoke }
]

const Router = createRouter({
    history: createWebHistory(),
    routes
})

export default Router

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(Router)
app.mount('#app')
