<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'

import { storeToRefs } from 'pinia'

import { getVpnStatuses } from '@/endpoints/organizations/GetVpnStatuses'
import { findNextFreeSubnet } from '@/utils/ipType'

import { useBoolStates } from '@/utils/Decorators'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { configuration } = storeToRefs(configStore)

const voiceVlanId = '115'

const { newNetworkId, orgId } = storeToRefs(ids)
orgId.value = '282061'

const freeSubnets = ref({} as { [key: string]: string })

let staffExcepts = new RegExp('10.113.([0-9]|1[0-9]|115).0/24')
let voiceExcepts = new RegExp('10.101.([0-9]|1[0-9]|2[0-9]|115).0/24')

// we normally get the json from the backend but for now we will hardcode it
const vpnSubnetsConfig =  [
    {
        name : "Staff",
        keywords : ["staff"],
        ranges : ["10.113.1.0/24-10.113.255.0/24"],
        excepts : [ staffExcepts ]
    },
    {
        name : "Voice",
        keywords : ["voice", "voix", "voic", "3cx", "téléphonie"],
        ranges : ["10.101.1.0/24-10.101.255.0/24"],
        excepts : [ voiceExcepts ]
    }
]

const vpnSubnets = ref({} as { [key: string]: any })

// fill the vpnSubnets object with { name: { ranges: [], excepts: [], subnets: [] } }
for (const vpnSubnet of vpnSubnetsConfig) {
    vpnSubnets.value[vpnSubnet.name] = {
        ranges: vpnSubnet.ranges,
        excepts: vpnSubnet.excepts,
        subnets: []
    }
}



// immediately determine the available voice vlan and site-to-site vpn subnets
const setup = async () => {
    const vpnStatuses = await getVpnStatuses(orgId.value)
    // map subnets in different arrays depending on the names
    // structure of vpnStatuses: [ { "exportedSubnet": [ {"name": string, "subnet": string} ] } ]

    console.log('VPN Statuses: ', vpnStatuses)
    for (const vpnStatus of vpnStatuses) {
        if (vpnStatus.networkName.includes('29052')) {
            console.log('VPN Status: ', vpnStatus)
        }

        if (!vpnStatus.exportedSubnets) {
            continue
        }
        if (vpnStatus.vpnMode === 'hub') {
            continue
        }


        for (const subnet of vpnStatus.exportedSubnets) {
            // group by name, if the subnet.name.LowerCase() contains a keyword from the vpnSubnetsConfig, add it to the corresponding array vpnSubnets[vpnSubnetsConfig.name]
            for (const vpnSubnet of vpnSubnetsConfig) {
                for (const keyword of vpnSubnet.keywords) {
                    if (subnet.name.toLowerCase().includes(keyword)) {
                        vpnSubnets.value[vpnSubnet.name].subnets.push(subnet.subnet)
                    }
                }
            }
        }
    }

    console.log('VPN Subnets: ', vpnSubnets.value)

    // find the next available subnet for each name
    for (const [name, vpnSubnet] of Object.entries(vpnSubnets.value)) {
        const freeSubnet = findNextFreeSubnet(vpnSubnet.subnets, vpnSubnet.ranges, vpnSubnet.excepts)
        freeSubnets.value[name] = freeSubnet
    }

    console.log('Free subnets: ', freeSubnets.value)
}

onMounted(setup)
</script>

<template>
    <div>
        <!-- show the next available subnet for each subnet name -->
        <div v-for="([name, subnet], index) in Object.entries(freeSubnets)" :key="index">
            <p>Next free subnet for : {{ name }} -> {{ subnet }}</p>
        </div>
    </div>
</template>
