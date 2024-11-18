import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import { useErrorStore } from './stores/error'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
// import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';  
import { definePreset } from '@primevue/themes';


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
import EditNetwork from './pages/editNetwork.vue'

import 'primeicons/primeicons.css'

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
    { path: '/rickroll', component: Rickroll },
    { path: '/edit-network', component: EditNetwork }
]

const Router = createRouter({
    history: createWebHistory(),
    routes
})

export default Router


const pinia = createPinia()
const app = createApp(App)
const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi'
    },
    defaults: {
        VBtn: {
            rounded: 'lg',
            variant: 'outlined'
        }
    }
})


/*

app.config.errorHandler = function (err, vm, info) {
    // set error in store
    const errorStore = useErrorStore()
    errorStore.addError(`${err.message} (in ${vm?.$options?.name || 'unknown'}${info ? `info: ${info}` : ''})`)
    console.log(errorStore.errors)
}

window.onerror = function (message, source, lineno, colno, error) {
    // set error in store
    const errorStore = useErrorStore()
    errorStore.addError(`${message} (at ${source}:${lineno}:${colno})`)
    console.log(errorStore.errors)

}

window.onunhandledrejection = function (event) {
    // set error in store
    const errorStore = useErrorStore()
    errorStore.addError(`${event.reason}`)
    console.log(errorStore.errors)

}
*/

const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{indigo.50}',
            100: '{indigo.100}',
            200: '{indigo.200}',
            300: '{indigo.300}',
            400: '{indigo.400}',
            500: '{indigo.500}',
            600: '{indigo.600}',
            700: '{indigo.700}',
            800: '{indigo.800}',
            900: '{indigo.900}',
            950: '{indigo.950}'
        }
    }
});


app.use(pinia)
app.use(Router)
app.use(vuetify)
app.use(PrimeVue, {
    theme: {
        preset: MyPreset
    }
});
app.mount('#app')
