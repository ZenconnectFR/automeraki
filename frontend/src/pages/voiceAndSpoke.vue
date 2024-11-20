<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

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

import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Popover from 'primevue/popover';

const router = useRouter()
const route = useRoute()

const toast = useToast()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const { newNetworkId, orgId } = storeToRefs(ids)
// orgId.value = '282061'

const freeSubnets = ref({} as { [key: string]: string[] })
const visibleCounts = ref({} as { [key: string]: number })

const moreOptions = ref(false)

const editingRows = ref([])

const onRowEditSave = (event: any) => {
    let { newData, index } = event;
    console.log('[VPN]: Row edit save: ', newData, index)

    // update the subnet
    vpnSiteToSite.value.subnets[index] = { ...newData }
    vpnSiteToSite.value.subnets[index].modify = true
}

const mustEditHelpRef = ref()

const toggleMustEditHelp = (event) => {
    mustEditHelpRef.value.toggle(event)
}

const translationHelpRef = ref()

const toggleTranslationHelp = (event) => {
    translationHelpRef.value.toggle(event)
}


const getVisibleItems = (key: string) => {
    // console.log('Getting visible items for key: ', key)
    // console.log('Free subnets: ', freeSubnets.value)
    const list = freeSubnets.value[key];
    const count = visibleCounts.value[key] || 1;
    return list.slice(0, count);
}

const toggleVisibility = (key: string) => {
    const current = visibleCounts.value[key] || 1;
    const listLen = freeSubnets.value[key].length;

    console.log('Toggling visibility for key: ', key)
    console.log('Current: ', current)
    console.log('List length: ', listLen)

    switch (current) {
        case listLen:
            visibleCounts.value[key] = 1;
            break;
        case 1:
            visibleCounts.value[key] = 10;
            break;
        case 10:
            visibleCounts.value[key] = listLen;
            break;
    }
}

const getBtnLabel = (key: string) => {
    const current = visibleCounts.value[key] || 1;
    const listLen = freeSubnets.value[key].length;

    switch (current) {
        case listLen:
            return 'Show less';
        case 1:
            return 'Show more';
        case 10:
            return 'Show all';
    }
}
const vpnSubnetsConfig = config.vpnSubnets

const vpnSubnets = ref({} as { [key: string]: any })

const vpnSiteToSite = ref({} as { [key: string]: any })

const vpnStatusesError = ref('')

let vlans = []

const loading = ref(false)
const loaded = ref(false)
const orgWide = ref(false)

const copiedText = ref('')

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)

    // create a toast message for 3s
    toast.add({severity: 'secondary', summary: 'Copied to Clipboard!', life: 3000})
}

const copyNToCliboard = (event: any, subnets: string[]) => {
    const n = event.target.nToCopy.value
    const toCopy = subnets.slice(0, n)
    navigator.clipboard.writeText(toCopy.join('\n'))

    // create a toast message for 3s
    toast.add({severity: 'secondary', summary: 'Copied to Clipboard!', life: 3000})
}

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

    console.log('[VPN] orgId when setting up: ', orgId.value)

    const vpnStatuses = await getVpnStatuses(orgId.value)

    // check for errors
    if (vpnStatuses.error) {
        // console.log('VPN Statuses: ', vpnStatuses)
        // console.error('Error fetching VPN statuses: ', vpnStatuses.error)
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

        // const freeSubnet = findNextFreeSubnet(vpnSubnet.subnets, vpnSubnet.ranges, vpnSubnet.excepts)
        
        // for test: find 4 next free subnets
        while (true) {
            const freeSubnet = findNextFreeSubnet(vpnSubnet.subnets, vpnSubnet.ranges, vpnSubnet.excepts)
            if (freeSubnet == null) {
                break
            }
            // console.log('Free subnet for ', name, ': ', freeSubnet)
            // console.log('free subnets array: ', freeSubnets.value)
            if (!freeSubnets.value[name]) {
                freeSubnets.value[name] = []
            }
            freeSubnets.value[name].push(freeSubnet)
            vpnSubnet.subnets.push(freeSubnet)
        }
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
        let vlanConfig = {useVpn: false, localSubnet: '', translation: false}
        console.log('subnets config: ', siteToSiteConfig.subnets)
        // check whether the vlan is in the config, either its subnet or its id like VLAN(id)
        for (const subnet of siteToSiteConfig.subnets) {
            console.log('Checking vlan: ', vlan, ' with subnet: ', subnet)
            if (subnet.localSubnet == vlan.subnet || subnet.localSubnet == `VLAN(${vlan.id})` || subnet.localSubnet == `VNAT(${vlan.id})`) {
                vlanConfig.useVpn = subnet.useVpn
                vlanConfig.localSubnet = vlan.subnet
                vlanConfig.translation = subnet.translation
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
            useVpn: vlanConfig ? vlanConfig.useVpn && !vlanConfig.translation : false,
            modify: false,
            translation: vlanConfig ? vlanConfig.translation : false,
            mustEdit: !(vlanConfig ? vlanConfig.translation : false) && (vlanConfig ? vlanConfig.useVpn : false)
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

    let modifiedSubnets = []
    
    // update vlans: If a subnet value has changed (ie: subnet.localSubnet != vlanSubnet.subnet), update the vlan subnet and appliance Ip
    for (const subnet of vpnSiteToSite.value.subnets) {
        if (subnet.modify) {
            console.log('Updating subnet: ', subnet)
            modifiedSubnets.push(subnet.vlanId)
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
                            },
                            {
                                vpnNat: {
                                    enabled: true,
                                },
                                vpnNatSubnet: ""
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
                console.log('vlans updated: ', vlans)
            } else {
                console.error('Vlan not found for subnet: ', subnet)
                return
            }
        }

        // update the vpnNatSubnet of vlans that have translation enabled
        /*
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
            vlans = await getVlans(newNetworkId.value)
            console.log('vlans updated: ', vlans)
        }
        */
        
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
        subnets: vpnSiteToSite.value.subnets.map((subnet: { localSubnet: string, useVpn: boolean, translation: boolean}) => {
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

    // set the mustEdit flag to false for all subnets in modifiedSubnets
    for (const subnet of vpnSiteToSite.value.subnets) {
        if (modifiedSubnets.includes(subnet.vlanId)) {
            subnet.mustEdit = false
        }
    }
});

const goBack = () => {
    router.push(getRoutePath(configStore.prevPage()))
}

const nextPage = () => {
    router.push(getRoutePath(configStore.nextPage()))
};

const backSetup = () => {
    // empty configuration
    configStore.setConfiguration(null);
    router.push('/setup');
};

onMounted(() => {
    console.log('config: ', config)

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
    <div style="margin-top: 40px;">
        <h1>VPN Configuration</h1>
    </div>

    <Divider style="width: 250px" />

    <Button icon="pi pi-chevron-left" @click="moreOptions = true" label="More" class="vpn-btn top-right-btn"/>

    <Drawer v-model:visible="moreOptions" position="right" header="More options" style="width: 400px;">
        <Divider />
        <h2>Copy subnets</h2>
        <!-- relocate copy n subnets buttons here -->
        <div v-for="(name, index) in Object.keys(freeSubnets)" :key="index" style="margin-top: 20px;">
            <form @submit.prevent="copyNToCliboard($event, freeSubnets[name])">
                <h3>{{ name }}</h3>
                <Button type="submit">Copy</Button>
                <Toast position="bottom-center"/>
                <input type="number" name="nToCopy" value="20" class="custom-input" />
                <span>subnets.</span>
            </form>
        </div>
    </Drawer>

    <Button v-if="orgWide" id="homebtn" @click="backSetup">Back</Button>
    <div class="col center">
        <h2>Available subnets</h2>
        <!-- show the next available subnet for each subnet name -->
        <div style="margin-top: 20px;" v-for="(name, index) in Object.keys(freeSubnets)" :key="index">
            <h2>{{ name }}</h2>
            <div class="make-row">
                <ul>
                    <li v-for="(subnet, index) in getVisibleItems(name)" :key="index" style="margin-bottom: 10px;">
                        <span>{{ subnet }}</span>
                        <i style="margin-left: 15px; cursor: pointer;" class="pi pi-copy" @click="copyToClipboard(subnet)"/>
                        <Toast position="bottom-center"/>
                        <span v-if="copiedText == subnet">Copied!</span>
                    </li>
                </ul>
                <Button @click="toggleVisibility(name)" class="smaller-btn">{{ getBtnLabel(name) }}</Button>
                <Button @click="toggleVisibility(name); toggleVisibility(name)"
                    v-if="visibleCounts[name] && visibleCounts[name] > 1 && visibleCounts[name] < freeSubnets[name].length"
                    class="smaller-btn"
                >
                    Show less
                </Button>
            </div>
        </div>
        <p class="red" v-if="vpnStatusesError">{{ vpnStatusesError }}</p>
        <p v-if="loading">Loading...</p>
        <p v-if="loaded && Object.entries(freeSubnets).length === 0">No free subnets available</p>

        <!-- Site to Site vpn options -->
        <!-- Show the list of hubs with the ability to add or remove them
        Show the list of subnets with the ability to modify their nat translation -->
        <Divider style="width: 250px; margin-top: 30px;" />
        <div v-if="loaded && !orgWide" style="margin-top: 10px;">
            <h2>Site to Site VPN</h2>
            <h3>Hubs used</h3>
            <div v-for="hub in vpnSiteToSite.hubs" :key="hub.id">
                <p>{{ hub.name }}</p>
            </div>
            <h3 style="margin-top: 15px;">Subnets</h3>
            <!--div v-for="subnet in vpnSiteToSite.subnets" :key="subnet">
                <p style="margin-bottom: 10px;">{{ subnet.vlanName }}</p>
                <label for="modify">Modify</label>
                <input id="modify" type="checkbox" v-model="subnet.modify" @click="subnet.localSubnet = subnet.modify?subnet.localSubnet:subnet.originalLocalSubnet"/>
                <input v-if="subnet.modify" type="text" v-model="subnet.localSubnet"/>
                <span v-else>{{ subnet.localSubnet }}</span>
                use vpn: <input type="checkbox" v-model="subnet.useVpn" />
                
                <p v-if="subnet.translation" style="max-width: 400px;">This VLAN subnet should use translation, pick a free subnet for it at the top and enter it in Meraki</p>

                <p v-if="subnet.modify" class="red">
                    Warning: Changing the subnet will change the vlan subnet and appliance IP ! <br>
                    Make sure that there are no conflicts with fixed Ips, DHCP ranges, firewall rules, etc.
                </p>
            </div-->
            <DataTable :value="vpnSiteToSite.subnets" :rows="10" :rowsPerPageOptions="[5, 10, 20]" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event)" v-model:editingRows="editingRows" dataKey="vlanId"
                :pt="{
                    table: { style: 'min-width: 50rem' },
                    column: {
                        bodycell: ({ state }) => ({
                            style:  state['d_editing']&&'padding-top: 0.75rem; padding-bottom: 0.75rem'
                        })
                    }
                }"
            >
                <Column field="vlanName" header="VLAN Name"></Column>
                <Column field="localSubnet" header="Local Subnet">
                    <template #editor="{ data, field }">
                        <InputText v-if="!data.translation" v-model="data[field]" />
                        <span v-else>{{ data[field] }}</span>
                    </template>
                    <template #body="{ data }">
                        <span>{{ data.localSubnet }}</span>
                        <i v-if="data.mustEdit" class="pi pi-exclamation-circle" style="margin-left: 10px; cursor: pointer; color: var(--p-yellow-500);" @click="toggleMustEditHelp"></i>
                        <Popover ref="mustEditHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                            <p>This vlan subnet must be edited to use the VPN<br>Assign an available subnet to this vlan and save your changes<br>Note: This message will not disappear after saving.</p>
                        </Popover>
                    </template>
                </Column>
                <Column field="useVpn" header="Use VPN">
                    <template #body="{ data }">
                        <span v-if="!data.translation">{{ data.useVpn ? 'Yes' : 'No' }}</span>
                        <i v-else class="pi pi-exclamation-triangle" style="cursor: pointer; color: var(--p-red-500);" @click="toggleTranslationHelp"></i>
                        <Popover ref="translationHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                            <p>This vlan uses translation !<br>You must enable it and enter the next free subnet directly in Meraki Dashboard<br>as the API does not support VNAT translations.</p>
                        </Popover>
                    </template>
                </Column>
                <Column :row-editor="true" headerStyle="width: 7rem"></Column>
            </DataTable>
        </div>
    </div>
    <div v-if="!orgWide" style="margin-top: 30px; margin-bottom: 50px;" class="col center">
        <Button @click="saveVpnConfig">Save to Meraki</Button>
        <div class="row center" style="margin-top: 15px;">
            <Button style="margin-right: 15px;" @click="goBack">Back</Button>
            <Button @click="nextPage">Next</Button>
        </div>
    </div>
</template>

<style scoped>
.redglow {
    box-shadow: 0 0 5px red;
}

.red {
    color: red;
}

#homebtn {
    position: fixed;
    top: 20px;
    left: 20px;
    height: 40px;
    padding: 0 20px;
}

.top-right-btn {
    position: fixed;
    top: 20px;
    right: 0;
}

.custom-input {
    width: 75px;
    border: 1px solid #616161;
    margin-left: 10px;
    margin-right: 10px;
    border-radius: 8px;
    padding: 7px;
}

.copied-message {
    opacity: 1;
    transition: opacity 0.5s ease;
    position: 'absolute';
    top: '50px';
    right: '10px';
    background-color: '#4CAF50';
    color: 'white';
    padding: '10px';
    border-radius: '5px';
    box-shadow: '0 4px 8px rgba(0, 0, 0, 0.2)';
    transition: 'opacity 0.5s';
}

.copied-message.fade-out {
  opacity: 0;
}

.smaller-btn {
    margin-left: 10px;
    padding: 7px;
    font-size: 14px;
}
</style>