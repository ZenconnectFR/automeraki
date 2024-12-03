import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/pages/home.vue'
import Setup from '@/pages/setup.vue'
import Claim from '@/pages/claim.vue'
import Naming from '@/pages/naming.vue'
import Vlan from '@/pages/vlan.vue'
import Firewall from '@/pages/firewall.vue'
import Ports from '@/pages/ports.vue'
import FixedIp from '@/pages/fixedIp.vue';
import voiceAndSpoke from '@/pages/voiceAndSpoke.vue';
import TagNetwork from '@/pages/tagNetwork.vue';
import Misc from '@/pages/misc.vue';
import Complete from '@/pages/complete.vue';
import EditNetwork from '@/pages/editNetwork.vue'
import blinkDevices from '@/pages/blinkDevices.vue'

const routes = [
    { path: '/', component: Home},
    { path: '/setup', component: Setup },
    { path: '/claim', component: Claim },
    { path: '/naming', component: Naming },
    { path: '/vlan', component: Vlan },
    { path: '/firewall', component: Firewall },
    { path: '/ports', component: Ports },
    { path: '/fixed-ip', component: FixedIp},
    { path: '/voice-and-spoke', component: voiceAndSpoke },
    { path: '/tag-network', component: TagNetwork },
    { path: '/misc', component: Misc },
    { path: '/complete', component: Complete },
    { path: '/edit-network', component: EditNetwork },
    { path: '/blink', component: blinkDevices }
]

const Router = createRouter({
    history: createWebHistory(),
    routes
})

export default Router