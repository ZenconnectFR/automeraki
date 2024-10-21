<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'

import { storeToRefs } from 'pinia'

import { getVpnStatuses } from '@/endpoints/organizations/GetVpnStatuses'
import { findNextFreeSubnet } from '@/utils/ipType'
import { getRoutePath } from '@/utils/PageRouter'
import { getVlans } from '@/endpoints/networks/GetVlans'
import { getNetwork } from '@/endpoints/networks/GetNetwork'
import { updateNetworkVlan } from '@/endpoints/networks/UpdateNetworkVlan'
import { updateSiteToSiteVpn } from '@/endpoints/networks/updateSiteToSiteVpn'

import { modifyIpToSubnet } from '@/utils/ipType'

import { useBoolStates } from '@/utils/Decorators'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const { newNetworkId, orgId } = storeToRefs(ids)
// orgId.value = '282061'

const freeSubnets = ref({} as { [key: string]: string })

const vpnSubnetsConfig = config.vpnSubnets

const vpnSubnets = ref({} as { [key: string]: any })

const vpnSiteToSite = ref({} as { [key: string]: any })

const vpnStatusesError = ref('')

let vlans = []

const loading = ref(false)
const loaded = ref(false)
const orgWide = ref(false)

// fill the vpnSubnets object with { name: { ranges: [], excepts: [], subnets: [] } }
const fillVpnSubnets = () => {
    for (const vpnSubnet of config.vpnSubnets) {
        vpnSubnets.value[vpnSubnet.name] = {
            ranges: vpnSubnet.ranges,
            excepts: vpnSubnet.excepts.map((except: string) => new RegExp(except)),
            subnets: []
        }
    }
}

// immediately determine the available voice vlan and site-to-site vpn subnets
const setup = useBoolStates([loading], [loaded], async () => {
    fillVpnSubnets();
    const vpnStatuses = await getVpnStatuses(orgId.value)

    // check for errors
    if (vpnStatuses.error) {
        console.log('VPN Statuses: ', vpnStatuses)
        console.error('Error fetching VPN statuses: ', vpnStatuses.error)
        vpnStatusesError.value = vpnStatuses.error
        return
    }

    // set of subnet names for debug:
    let subnetNames = new Set<string>()

    // map subnets in different arrays depending on the names
    // structure of vpnStatuses: [ { "exportedSubnet": [ {"name": string, "subnet": string} ] } ]

    console.log('VPN Statuses: ', vpnStatuses)
    for (const vpnStatus of vpnStatuses) {
        if (vpnStatus.vpnMode === 'hub') {
            continue
        }

        
        for (const subnet of vpnStatus.exportedSubnets) {
            // group by name, if the subnet.name.LowerCase() contains a keyword from the vpnSubnetsConfig, add it to the corresponding array vpnSubnets[vpnSubnetsConfig.name]
            for (const vpnSubnet of vpnSubnetsConfig) {
                // add the name to the set
                subnetNames.add(subnet.name.toLowerCase())
                for (const keyword of vpnSubnet.keywords) {
                    if (subnet.name.toLowerCase() == keyword.toLowerCase()) {
                        vpnSubnets.value[vpnSubnet.name].subnets.push(subnet.subnet)
                    }
                }
            }
        }
    }

    console.log('VPN Subnets: ', vpnSubnets.value)
    console.log('Subnet names: ', subnetNames)

    // find the next available subnet for each name
    for (const [name, vpnSubnet] of Object.entries(vpnSubnets.value)) {

        const freeSubnet = findNextFreeSubnet(vpnSubnet.subnets, vpnSubnet.ranges, vpnSubnet.excepts)
        freeSubnets.value[name] = freeSubnet
    }

    console.log('Free subnets: ', freeSubnets.value)

    // skip the rest of the setup if the orgWide flag is set
    if (orgWide.value) {
        loaded.value = true
        return
    }

    const siteToSiteConfig = config.siteToSite;

    console.log('Site to Site Config: ', siteToSiteConfig)

    // init vpnSiteToSite object
    vpnSiteToSite.value = {
        hubs: [],
        subnets: []
    }

    // populate the hubs
    for (const hub of siteToSiteConfig.hubs) {
        // get the hub name (hub.hubId is a network id)
        const hubNetwork = await getNetwork(hub.hubId)
        vpnSiteToSite.value.hubs.push({
            name: hubNetwork.name,
            id: hub.hubId,
            useDefaultRoute: hub.useDefaultRoute
        })
    }

    // populate the subnets
    for (const vlan of vlans) {
        // find if a config exists for this vlan
        let vlanConfig: { useVpn: any };
        // check whether the vlan is in the config, either its subnet or its id like VLAN(id)
        for (const subnet of siteToSiteConfig.subnets) {
            console.log('Checking vlan: ', vlan, ' with subnet: ', subnet)
            if (subnet.localSubnet == vlan.subnet || subnet.localSubnet == `VLAN(${vlan.id})`) {
                vlanConfig = subnet
                break
            }
        }

        console.log('Vlan config: ', vlanConfig)

        // add the vlan to the vpnSiteToSite object
        vpnSiteToSite.value.subnets.push({
            vlanName: vlan.name,
            vlanId: vlan.id,
            localSubnet: vlan.subnet,
            originalLocalSubnet: vlan.subnet,
            useVpn: vlanConfig ? vlanConfig.useVpn : false,
            modify: false,
            translation: vlan.vpnNatSubnet ? true : false,
            translationValue: vlan.vpnNatSubnet ? vlan.vpnNatSubnet : ''
        })
    }

    // order by vlan id (string, parse to int)
    vpnSiteToSite.value.subnets.sort((a, b) => {
        if (a.vlanId && b.vlanId) {
            return parseInt(a.vlanId) - parseInt(b.vlanId)
        } else {
            return 0
        }
    })

    console.log('Site to Site VPN: ', vpnSiteToSite.value)
});

const saveVpnConfig = useBoolStates([loading], [loaded], async () => {
    console.log('Saving VPN config: ', vpnSiteToSite.value)
    // save the vpn config
    
    // update vlans: If a subnet value has changed (ie: subnet.localSubnet != vlanSubnet.subnet), update the vlan subnet and appliance Ip
    for (const subnet of vpnSiteToSite.value.subnets) {
        if (subnet.modify) {
            console.log('Updating subnet: ', subnet)
            const vlan = vlans.find((vlan: { subnet: string }) => vlan.subnet == subnet.originalLocalSubnet)
            if (vlan) {
                // generate the new appliance IP: subnet but the masked part is the one from the vlan appliance IP
                let newApplianceIp = modifyIpToSubnet(vlan.applianceIp, subnet.localSubnet)
                console.log('[VPN] New appliance IP: ', newApplianceIp)

                // update the vlan subnet and appliance IP
                const updateResponse = await updateNetworkVlan(newNetworkId.value,[
                    {
                        id: vlan.id,
                        payload: [
                            {
                                applianceIp: newApplianceIp,
                                subnet: subnet.localSubnet
                            }
                        ]
                    }
                ])

                console.log('Update response: ', updateResponse)
                if (updateResponse.error) {
                    console.error('Error updating vlan: ', updateResponse.error)
                    return
                }

                subnet.originalLocalSubnet = subnet.localSubnet

                // refresh the vlan list
                vlans = await getVlans(newNetworkId.value)
            } else {
                console.error('Vlan not found for subnet: ', subnet)
                return
            }
        }

        // update the vpnNatSubnet of vlans that have translation enabled
        if (subnet.translation) {
            console.log('Updating translation for subnet: ', subnet)
            const vlan = vlans.find((vlan: { subnet: string }) => vlan.subnet == subnet.originalLocalSubnet)
            if (vlan) {
                // update the vpnNatSubnet
                const updateResponse = await updateNetworkVlan(newNetworkId.value,[
                    {
                        id: vlan.id,
                        payload: [
                            {
                                vpnNat: {
                                    enabled: true,
                                },
                                vpnNatSubnet: subnet.translationValue
                            }
                        ]
                    }
                ])

                console.log('Update response: ', updateResponse)
                if (updateResponse.error) {
                    console.error('Error updating vlan: ', updateResponse.error)
                    return
                }
            } else {
                console.error('Vlan not found for subnet: ', subnet)
                return
            }
        }
    }

    // update the site to site vpn config
    let siteToSitePayload = {
        mode: "spoke",
        hubs: vpnSiteToSite.value.hubs.map((hub: { id: string, useDefaultRoute: boolean }) => {
            return {
                hubId: hub.id,
                useDefaultRoute: hub.useDefaultRoute
            }
        }),
        subnets: vpnSiteToSite.value.subnets.map((subnet: { localSubnet: string, useVpn: boolean, translation: boolean, translationValue: string }) => {
            return {
                localSubnet: subnet.localSubnet,
                useVpn: subnet.useVpn
            }
        })
    }

    console.log('Site to Site VPN payload: ', siteToSitePayload)

    await updateSiteToSiteVpn(newNetworkId.value, siteToSitePayload)

    // reset available subnets and empty vpnSubnets
    freeSubnets.value = {}
    for (const vpnSubnet of vpnSubnetsConfig) {
        vpnSubnets.value[vpnSubnet.name].subnets = []
    }

    // reload the page
    await setup()
});

const goBack = () => {
    router.push(getRoutePath(configStore.prevPage()))
}

const nextPage = () => {
    router.push(getRoutePath(configStore.nextPage()))
}

onMounted(() => {

    orgWide.value = route.query.orgWide?true:false
    if (!orgWide.value) {
        getVlans(newNetworkId.value).then((response) => {
            vlans = response
        })
    }
    setup()
})
</script>

<template>
    <div>
        <!-- show the next available subnet for each subnet name -->
        <div v-for="([name, subnet], index) in Object.entries(freeSubnets)" :key="index">
            <p>Next free subnet for : {{ name }} -> {{ subnet }}</p>
        </div>
        <p class="red" v-if="vpnStatusesError">{{ vpnStatusesError }}</p>
        <p v-if="loading">Loading...</p>
        <p v-if="loaded && Object.entries(freeSubnets).length === 0">No free subnets available</p>

        <!-- Site to Site vpn options -->
        <!-- Show the list of hubs with the ability to add or remove them
        Show the list of subnets with the ability to modify their nat translation -->
        <div v-if="loaded && !orgWide">
            <h2>Site to Site VPN</h2>
            <h3>Hubs</h3>
            <div v-for="hub in vpnSiteToSite.hubs" :key="hub.id">
                <p>{{ hub.name }} - {{ hub.id }}</p>
                <input v-if="!orgWide" type="checkbox" v-model="hub.useDefaultRoute" />
            </div>
            <h3>Subnets</h3>
            <div v-for="subnet in vpnSiteToSite.subnets" :key="subnet">
                <p>{{ subnet.vlanName }}</p>
                <label for="modify">Modify</label>
                <input id="modify" type="checkbox" v-model="subnet.modify" @click="subnet.localSubnet = subnet.modify?subnet.localSubnet:subnet.originalLocalSubnet"/>
                <input v-if="subnet.modify" type="text" v-model="subnet.localSubnet"/>
                <span v-else>{{ subnet.localSubnet }}</span>
                <!-- enable vpn use part-->
                use vpn: <input type="checkbox" v-model="subnet.useVpn" />
                <!-- nat vpn translation part-->
                use translation: <input type="checkbox" v-model="subnet.translation" />
                <input type="text" v-model="subnet.translationValue" :enabled="subnet.translation"/>

                <p v-if="subnet.modify" class="red">
                    Warning: Changing the subnet will change the vlan subnet and appliance IP ! <br>
                    Make sure that there are no conflicts with fixed Ips, DHCP ranges, firewall rules, etc.
                </p>
            </div>
        </div>
    </div>
    <div v-if="!orgWide">
        <button @click="saveVpnConfig">Save</button>
        <button @click="goBack">Back</button>
        <button @click="nextPage">Next</button>
    </div>
</template>

<style scoped>
.redglow {
    box-shadow: 0 0 5px red;
}

.red {
    color: red;
}
</style>
