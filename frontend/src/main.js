import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'


// Try to move this part to a separate file in the future if possible
import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/pages/home.vue'
import Setup from '@/pages/setup.vue'
import Claim from '@/pages/claim.vue'
import Naming from '@/pages/naming.vue'
import Vlan from '@/pages/vlan.vue'
import Firewall from '@/pages/firewall.vue'
import Ports from '@/pages/ports.vue'
import FixedIp from './pages/fixedIp.vue';
import Wans from './pages/wans.vue';
import voiceAndSpoke from './pages/voiceAndSpoke.vue';
import TagNetwork from './pages/tagNetwork.vue';
import Misc from './pages/misc.vue';
import Complete from './pages/complete.vue';
import Rickroll from './pages/rickroll.vue';

import Next from './pages/next.vue';

const routes = [
    { path: '/', component: Home},
    { path: '/setup', component: Setup },
    { path: '/claim', component: Claim },
    { path: '/naming', component: Naming },
    { path: '/vlan', component: Vlan },
    { path: '/firewall', component: Firewall },
    { path: '/ports', component: Ports },
    { path: '/fixed-ip', component: FixedIp},
    { path: '/wans', component: Wans},
    { path: '/voice-and-spoke', component: voiceAndSpoke },
    { path: '/tag-network', component: TagNetwork },
    { path: '/misc', component: Misc },
    { path: '/complete', component: Complete },
    { path: '/next', component: Next },
    { path: '/rickroll', component: Rickroll }
]

const Router = createRouter({
    history: createWebHistory(),
    routes
})

export default Router

// Global error handler
/*
window.onerror = function (message, source, lineno, colno, error) {
    console.log('Global error handler; Error: ', error, 'message: ', message, 'source: ', source, 'lineno: ', lineno, 'colno: ', colno)
    window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
}
*/

const pinia = createPinia()
const app = createApp(App)
const vuetify = createVuetify({
    components
})

/*
app.config.errorHandler = function (err, vm, info) {
    console.log('Error handler; Error: ', err, 'vm: ', vm, 'info: ', info)
    window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
}
*/

app.use(pinia)
app.use(Router)
app.use(vuetify)
app.mount('#app')
