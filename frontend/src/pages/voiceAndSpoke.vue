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

console.log('Configuration: ', configuration.value)

const voiceVlanId = '115'

const { newNetworkId, orgId } = storeToRefs(ids)
// orgId.value = '282061'

const freeSubnets = ref({} as { [key: string]: string })

const vpnSubnetsConfig = configuration.value.vpnSubnets

const vpnSubnets = ref({} as { [key: string]: any })

const vpnStatusesError = ref('')

// fill the vpnSubnets object with { name: { ranges: [], excepts: [], subnets: [] } }
for (const vpnSubnet of vpnSubnetsConfig) {
    vpnSubnets.value[vpnSubnet.name] = {
        ranges: vpnSubnet.ranges,
        excepts: vpnSubnet.excepts.map((except: string) => new RegExp(except)),
        subnets: []
    }
}

// immediately determine the available voice vlan and site-to-site vpn subnets
const setup = async () => {
    const vpnStatuses = await getVpnStatuses(orgId.value)

    // check for errors
    if (vpnStatuses.error) {
        console.log('VPN Statuses: ', vpnStatuses)
        console.error('Error fetching VPN statuses: ', vpnStatuses.error)
        vpnStatusesError.value = vpnStatuses.error
        return
    }

    // map subnets in different arrays depending on the names
    // structure of vpnStatuses: [ { "exportedSubnet": [ {"name": string, "subnet": string} ] } ]

    console.log('VPN Statuses: ', vpnStatuses)
    for (const vpnStatus of vpnStatuses) {
        if (!vpnStatus.exportedSubnets || vpnStatus.exportedSubnets.length === 0  || vpnStatus.vpnMode === 'hub') {
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
        <p class="red" v-if="vpnStatusesError">{{ vpnStatusesError }}</p>
    </div>
</template>

<style scoped>
.red {
    color: red;
}
</style>
