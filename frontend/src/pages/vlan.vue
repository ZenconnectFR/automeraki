<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { useNextStatesStore } from '@/stores/nextStates'
import { storeToRefs } from 'pinia'

import { updateNetworkVlan } from '@/endpoints/networks/UpdateNetworkVlan'
import { createVlansIfNotExists } from '@/endpoints/networks/CreateVlansIfNotExists'
import { enableVlans } from '@/endpoints/networks/EnableVlans'
import { configurePerPortVlan } from '@/endpoints/actionBatches/ConfigurePerPortVlan'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'
import { createMac } from '@/utils/Misc'
import { maskIpWithSubnet, modifyIpWithoutChangingMask } from '@/utils/ipType'
import { parseJsonError } from '@/utils/Misc'

import { useRouter, useRoute } from 'vue-router'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Drawer from 'primevue/drawer'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import Popover from 'primevue/popover';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import Tag from 'primevue/tag';
import { Portal } from 'primevue'

const toast = useToast();

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()
const nextStates = useNextStatesStore()

const { currentPageConfig, currentPageIndex } = storeToRefs(configStore)
let config = currentPageConfig.value
let thisState = nextStates.getState(currentPageIndex.value)

console.log('Configuration: ', config)

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const vlanIsAutoConfigured = ref(false)
const vlanAutoConfigured = ref([] as any[])

const perPortVlan = ref([] as any[])

const moreOptions = ref(false)

let autoMac = createMac()

const commonIpHelpRef = ref()

const toggleCommonIpHelp = (event: any) => {
    commonIpHelpRef.value.toggle(event);
}

// groups of common ips: ip are "common" if they have at least two parts in common
// each group is of the form : { vlans: [vlan1, vlan2, ...], commonParts: { part1: value1 | null, part2: value2 | null, ... } }
// the common parts for two vlans appliance ip in a group must always be the same (so we need to be careful when checking on the 3rd potential member of the group)

/**
Using typescript
I need to make a function to modify ipv4s that have similar octets values and one to edit the common octets values
I start we a lot of "vlan" objects whose ips can be accessed via vlan.payload[0].applianceIp
Some specifications are :
groups of common ips: ip are "common" if they have at least two parts in common
each group is of the form : { vlans: [vlanId1, vlanId2, ...], commonParts: { part1: value1 | null, part2: value2 | null, ... } }
the common parts for two vlans appliance ip in a group must always be the same (so we need to be careful when checking on the 3rd potential member of the group)

We will then have to display each of those common ip groups in a vue html element, so a v-for on the groups so that for each group,
we can see the the vlanId of each vlan the group contains, and the common ip parts that are shared between them.
Each part is in a input field, and if the part is common to all the vlans in the group, it can be edited. If not (ie it is null), it is disabled.
When edited, it will trigger a call back function that will update the common ip parts of all the vlans in the group.
 */
const commonIpsGroups = ref([] as any[])

const countCommonParts = (ip1: string, ip2: string | any) => {
    // console.log('[VLAN] Counting common parts between: ', ip1, ip2)
    let ip1Parts = ip1.split('.')
    if (typeof ip2 === 'string') {
        // console.log('[VLAN] ip2 is a string')
        let ip2Parts = ip2.split('.')
        let commonParts = 0
        for (let i = 0; i < 4; i++) {
            if (ip1Parts[i] === ip2Parts[i]) {
                commonParts++
            }
        }
        return commonParts
    } else {
        // console.log('[VLAN] ip2 is an array')
        let commonParts = 0
        if (ip2.part1 !== null && ip1Parts[0] === ip2.part1) {
            commonParts++
        }
        if (ip2.part2 !== null && ip1Parts[1] === ip2.part2) {
            commonParts++
        }
        if (ip2.part3 !== null && ip1Parts[2] === ip2.part3) {
            commonParts++
        }
        if (ip2.part4 !== null && ip1Parts[3] === ip2.part4) {
            commonParts++
        }
        return commonParts
    }
}

const autoMacHelpRef = ref()

const toggleAutoMacHelp = (event: any) => {
    autoMacHelpRef.value.toggle(event);
}

// go over all the vlans and compute the common parts of the appliance IPs
const computeIpsGroups = () => {
    let groups = []
    // console.log('[VLAN] Computing common ips groups')
    // console.log('[VLAN] groups at the very beginning: ', JSON.stringify(groups))
    for (const vlan of vlanAutoConfigured.value) {
        // console.log('[VLAN] Computing common ips for vlan: ', vlan)
        // console.log('[VLAN] Groups at the beginning: ', JSON.stringify(groups))
        let ip = vlan.payload[0].applianceIp.split('.')

        // case one, no group yet, create a new one
        if (groups.length === 0) {
            // console.log('[VLAN] No group yet, creating a new one')
            groups.push({
                vlans: [vlan.id],
                commonParts: {
                    part1: ip[0],
                    part2: ip[1],
                    part3: ip[2],
                    part4: ip[3]
                }
            })
            // console.log('[VLAN] Group created: ', groups[0])
            // console.log('[VLAN] Groups after creation: ', groups)
            continue
        }
        // case two, there is at least one group, find the group that has the most common parts with the current vlan
        let maxCommonParts = 0
        let bestGroupIndex = -1
        for (let i = 0; i < groups.length; i++) {
            let commonParts = countCommonParts(vlan.payload[0].applianceIp, groups[i].commonParts)
            if (commonParts > maxCommonParts) {
                maxCommonParts = commonParts
                bestGroupIndex = i
            }
        }

        // console.log('[VLAN] Best group index: ', bestGroupIndex, ' with ', maxCommonParts, ' common parts')

        if (maxCommonParts < 2) {
            // no group has at least 2 common parts with the current vlan, create a new group
            groups.push({
                vlans: [vlan.id],
                commonParts: {
                    part1: ip[0],
                    part2: ip[1],
                    part3: ip[2],
                    part4: ip[3]
                }
            })
            continue
        }

        // group is found, now we have two cases:
        // 1. the group has only 1 vlan, thus there are no null parts in the commonParts object. We can update it to reflect the common parts with the current vlan
        // 2. the group has more than 1 vlan, thus there may be null parts in the commonParts object. We only add the current vlan to the group if the common parts are the same
        if (groups[bestGroupIndex].vlans.length === 1) {
            // console.log('[VLAN] Group only has one vlan, updating common parts')
            groups[bestGroupIndex].vlans.push(vlan.id)
            groups[bestGroupIndex].commonParts = {
                part1: ip[0] === groups[bestGroupIndex].commonParts.part1 ? ip[0] : null,
                part2: ip[1] === groups[bestGroupIndex].commonParts.part2 ? ip[1] : null,
                part3: ip[2] === groups[bestGroupIndex].commonParts.part3 ? ip[2] : null,
                part4: ip[3] === groups[bestGroupIndex].commonParts.part4 ? ip[3] : null
            }
            // console.log('[VLAN] Updated group: ', groups[bestGroupIndex])
        } else {
            // console.log('[VLAN] Group has more than one vlan, checking common parts')
            let isSame = true
            if (groups[bestGroupIndex].commonParts.part1 !== null && ip[0] !== groups[bestGroupIndex].commonParts.part1) {
                isSame = false
                // console.log('[VLAN] Part 1 is different')
            }
            if (groups[bestGroupIndex].commonParts.part2 !== null && ip[1] !== groups[bestGroupIndex].commonParts.part2) {
                isSame = false
                // console.log('[VLAN] Part 2 is different')
            }
            if (groups[bestGroupIndex].commonParts.part3 !== null && ip[2] !== groups[bestGroupIndex].commonParts.part3) {
                isSame = false
                // console.log('[VLAN] Part 3 is different')
            }
            if (groups[bestGroupIndex].commonParts.part4 !== null && ip[3] !== groups[bestGroupIndex].commonParts.part4) {
                isSame = false
                // console.log('[VLAN] Part 4 is different')
            }
            if (isSame) {
                // console.log('[VLAN] Common parts are the same, adding vlan to group')
                groups[bestGroupIndex].vlans.push(vlan.id)
            } else {
                // console.log('[VLAN] Common parts are different, creating a new group')
                groups.push({
                    vlans: [vlan.id],
                    commonParts: {
                        part1: ip[0],
                        part2: ip[1],
                        part3: ip[2],
                        part4: ip[3]
                    }
                })
            }
        }
    }

    console.log('[VLAN] Common ips groups: ', groups)
    commonIpsGroups.value = groups
}

const updateCommonIp = (group: any) => {
    console.log('[VLAN] Updating common ip: ', group)
    let vlans = vlanAutoConfigured.value.filter((vlan) => group.vlans.includes(vlan.id))
    for (const vlan of vlans) {
        // update applianceIp
        let ip = vlan.payload[0].applianceIp.split('.')
        if (group.commonParts.part1 !== null) {
            ip[0] = group.commonParts.part1
        }
        if (group.commonParts.part2 !== null) {
            ip[1] = group.commonParts.part2
        }
        if (group.commonParts.part3 !== null) {
            ip[2] = group.commonParts.part3
        }
        if (group.commonParts.part4 !== null) {
            ip[3] = group.commonParts.part4
        }
        vlan.payload[0].applianceIp = ip.join('.')

        // update subnet
        let subnet = vlan.payload[0].subnet.split('/')
        let maskedIp = maskIpWithSubnet(vlan.payload[0].applianceIp, subnet[1])
        vlan.payload[0].subnet = maskedIp + '/' + subnet[1]

        // update fixedIpAssignments without changing the masked part
        for (const assignment of vlan.payload[1].fixedIpAssignments) {
            let ip = assignment.ip.split('.')
            if (group.commonParts.part1 !== null) {
                ip[0] = group.commonParts.part1
            }
            if (group.commonParts.part2 !== null) {
                ip[1] = group.commonParts.part2
            }
            if (group.commonParts.part3 !== null) {
                ip[2] = group.commonParts.part3
            }
            if (group.commonParts.part4 !== null) {
                ip[3] = group.commonParts.part4
            }
            console.log('[VLAN] Updating fixed ip: ', assignment.ip, 'to ', ip.join('.'), ' with subnet mask: ', subnet[1])
            assignment.ip = modifyIpWithoutChangingMask(assignment.ip, ip.join('.'), subnet[1])
            console.log('[VLAN] Updated fixed ip: ', assignment.ip)
        }

        // update reservedIpRanges without changing the masked part
        for (const reservedIpRange of vlan.payload[1].reservedIpRanges) {
            let start = reservedIpRange.start.split('.')
            if (group.commonParts.part1 !== null) {
                start[0] = group.commonParts.part1
            }
            if (group.commonParts.part2 !== null) {
                start[1] = group.commonParts.part2
            }
            if (group.commonParts.part3 !== null) {
                start[2] = group.commonParts.part3
            }
            if (group.commonParts.part4 !== null) {
                start[3] = group.commonParts.part4
            }
            reservedIpRange.start = modifyIpWithoutChangingMask(reservedIpRange.start, start.join('.'), subnet[1])

            let end = reservedIpRange.end.split('.')
            if (group.commonParts.part1 !== null) {
                end[0] = group.commonParts.part1
            }
            if (group.commonParts.part2 !== null) {
                end[1] = group.commonParts.part2
            }
            if (group.commonParts.part3 !== null) {
                end[2] = group.commonParts.part3
            }
            if (group.commonParts.part4 !== null) {
                end[3] = group.commonParts.part4
            }
            reservedIpRange.end = modifyIpWithoutChangingMask(reservedIpRange.end, end.join('.'), subnet[1])
        }
    }
}

// UI states
const savingChanges = ref(false)

/**
 * Auto configure vlan:
 * Retrieve the list of devices from the devices store and compare the expected equipment with the actual equipment last group of letters in the name
 * When an equipement is found, add {name: nameFromStore, ip: ipFromConfig, mac: macFromStore} to vlanAutoConfigured
 */

const configureVlans = () => {
    let devicesListV = devicesList.value
    let vlans = config.vlans

    console.log('[VLAN] devices: ', devices)
    console.log('[VLAN] vlans: ', vlans)

    for (const vlan of vlans) {
        vlanAutoConfigured.value.push(
            {
                id: vlan.id,
                payload: [
                    {
                        name: vlan.name,
                        applianceIp: vlan.applianceIp,
                        subnet: vlan.subnet
                    },
                    {
                        fixedIpAssignments: [],
                        reservedIpRanges: [],
                        dhcpOptions: []
                    }
                ]
            }
        );

        console.log('[VLAN] vlanAutoConfigured: ', vlanAutoConfigured.value)

        for (const assignment of vlan.fixedAssignments) {
            console.log('[VLAN] assignment: ', assignment)
            let found = false
            for (const device of devicesListV) {
                if (device.name.includes(assignment.expectedEquipment)) {
                    // add the device to the vlanAutoConfigured payload with mac as key
                    vlanAutoConfigured.value[vlanAutoConfigured.value.length - 1].payload[1].fixedIpAssignments.push({
                        ip: assignment.ip,
                        name: assignment.expectedEquipment,
                        mac: device.mac,
                        autoMac: false
                    })
                    found = true
                    console.log('[VLAN] Device found: ', device)
                }
            }
            if (!found) {
                console.log('[VLAN] Device not found, adding placeholder: ', autoMac, ' for ', assignment.expectedEquipment)
                // add a placeholder device to the vlanAutoConfigured payload with mac as key
                vlanAutoConfigured.value[vlanAutoConfigured.value.length - 1].payload[1].fixedIpAssignments.push({
                    ip: assignment.ip,
                    name: assignment.expectedEquipment,
                    mac: autoMac,
                    autoMac: true
                })
                autoMac = createMac(autoMac)
            }
        }

        // add reservedIpRanges to the vlanAutoConfigured payload
        for (const reservedIpRange of vlan.reservedIpRanges) {
            vlanAutoConfigured.value[vlanAutoConfigured.value.length - 1].payload[1].reservedIpRanges.push({
                start: reservedIpRange.start,
                end: reservedIpRange.end,
                comment: reservedIpRange.comment
            })
        }

        // add dhcpOptions to the vlanAutoConfigured payload
        if (vlan.dhcpOptions) {
            for (const dhcpOption of vlan.dhcpOptions) {
                vlanAutoConfigured.value[vlanAutoConfigured.value.length - 1].payload[1].dhcpOptions.push({
                    code: dhcpOption.code,
                    type: dhcpOption.type,
                    value: dhcpOption.value
                })
            }
        }
    }

    for (const vlan of vlanAutoConfigured.value) {
        console.log('[VLAN] Adding vlan: ', vlan.id, " to devices store")
        devices.addVlan(Number(vlan.id))
    }

    // sort by id
    vlanAutoConfigured.value.sort((a, b) => a.id - b.id)

    console.log('[VLAN] vlanAutoConfigured after first config: ', vlanAutoConfigured.value)

    vlanIsAutoConfigured.value = true
}

const preEnableVlans = async() => {
    console.log('[VLAN] Enabling vlans')
    await enableVlans(newNetworkId.value)
}

const formatFixedAssignments = (fixedAssignments: any) => {
    let formattedFixedAssignments = {} as any
    for (const fixedAssignment of fixedAssignments) {
        formattedFixedAssignments[fixedAssignment.mac] = {
            ip: fixedAssignment.ip,
            name: fixedAssignment.name
        }
    }
    console.log('[VLAN] Formatted fixed assignments: ', formattedFixedAssignments)
    return formattedFixedAssignments
}

const confirm = useBoolStates([savingChanges],[],async () => {

    console.log('[VLAN] Saving changes: ', vlanAutoConfigured.value)

    const vlanAutoConfiguredFormatted = vlanAutoConfigured.value.map((vlan) => {
        return {
            id: vlan.id,
            payload: [
                {
                    name: vlan.payload[0].name,
                    applianceIp: vlan.payload[0].applianceIp,
                    subnet: vlan.payload[0].subnet
                },
                {
                    // for each fixedIpAssignment in payload[1].fixedIpAssignments, add it to the formatted payload
                    fixedIpAssignments: formatFixedAssignments(vlan.payload[1].fixedIpAssignments),
                    reservedIpRanges: vlan.payload[1].reservedIpRanges,
                    dhcpOptions: vlan.payload[1].dhcpOptions
                }
            ]
        }
    })

    console.log('[VLAN] vlanAutoConfigured: ', vlanAutoConfigured)
    console.log('[VLAN] vlanAutoConfiguredFormatted: ', vlanAutoConfiguredFormatted)


    // enable vlans
    await preEnableVlans()

    let createdVlans = await createVlansIfNotExists(newNetworkId.value, vlanAutoConfiguredFormatted) as any

    /* if createdVlans failed, toast the error and return
    if (createdVlans.data.error) {
        toast.add({severity:'error', summary:'Error enabling vlans', detail: parseJsonError(createdVlans.data.error.errors)});
        return
    }
    */

    // filter payload[0] part out of vlanAutoConfigured when vlan id is in createdVlans
    for (const vlan of vlanAutoConfiguredFormatted) {
        for (const createdVlan of createdVlans) {
            if (vlan.id === createdVlan) {
                vlan.payload.shift()
            }
        }
    }

    // Save changes
    console.log('[VLAN] Saving changes')
    try {
        await updateNetworkVlan(newNetworkId.value, vlanAutoConfiguredFormatted)
    } catch (error) {
        toast.add({severity:'error', summary:'Vlan', detail: 'Error saving vlan settings'});
        return
    }

    // update perPortVlan settings
    // for each perPortVlan in configuration.value, match the expectedEquipment with a device shortName
    // and add {serial: device.serial, config: perPortVlan[n]} to perPortVlan
    for (const perPortVlanConfig of config.perPortVlan) {
        console.log('[VLAN] perPortVlanConfig: ', perPortVlanConfig)
        console.log('Template configuration: ', config)
        console.log('Devices list: ', devicesList.value)
        for (const device of devicesList.value) {
            if (device.associationId === perPortVlanConfig.applianceName && perPortVlan.value.length === 0) {
                perPortVlan.value.push({
                    ports: perPortVlanConfig.ports
                })
            }
        }
    }

    // save perPortVlan settings with endpoint
    console.log('[VLAN] Saving perPortVlan settings : ', perPortVlan.value)
    const response =  await configurePerPortVlan(perPortVlan.value, orgId.value, newNetworkId.value)

    console.log('[VLAN] Response: ', response)

    // handle error in response
    if (response.response) { // this means there was an axios error
        toast.add({severity:'error', summary:'Error saving per port vlan settings', detail: `${parseJsonError(response.response.data.error)}\n\n If the error above says "Port x not found, switch the starting port between 1 and 3 in the "More" tab. This is due to MXs having different port numbering.`});
        return
    }

    toast.add({severity:'success', summary:'Success', detail:'VLAN configuration saved successfully'});

    thisState = true;
    nextStates.setStateTrue(currentPageIndex.value)
});


const validate = () => {
    let path =  getRoutePath(configStore.nextPage());
    console.log('[VLAN] Next page: ', path)
    router.push(path)
}

const goBack = () => {
    router.push(getRoutePath(configStore.prevPage()));
}

onMounted(() => {
    // empty vlan store lmao, there are 200 entries in the store because I forgot to clear it since the beginning
    devices.clearVlans()

    configureVlans()
    // computeCommonIps()
    // console.log('[VLAN] commonIps: ', commonIps.value)
    computeIpsGroups()
})

</script>

<template>
    <div style="margin-top: 40px; margin-bottom: 60px">
        <Toast position="top-right" />

        <Button icon="pi pi-chevron-left" @click="moreOptions = true" label="More" class="vpn-btn top-right-btn"/>

        <Drawer v-model:visible="moreOptions" header="Extra features" position="right" style="width: 500px;">

            <Divider />
            
            <div class="col center" id="commonIps">
                <span class="pi pi-question-circle center" @click="toggleCommonIpHelp" style="align-self: flex-end; cursor: pointer;"></span>
                <h2 >Common appliance IPs</h2>
                <Popover ref="commonIpHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                    <p>Edit the appliance IP and subnet of all the vlans with common ip parts at the same time</p>
                </Popover>
                <div v-for="(group, index) in commonIpsGroups" :key="index">
                    <div class="col center">
                        <div class="row center">
                            <span class="lateral-margin-small">Vlans</span>
                            <Tag v-for="(vlan, index) in group.vlans" :key="index" class="lateral-margin-small">
                                {{ vlan }}
                            </Tag>
                        </div>
                        <div class="row center">
                            <input class="margin-all-normal enboxed short" v-model="group.commonParts.part1" :disabled="group.commonParts.part1 === null" placeholder="x" @input="updateCommonIp(group)"/>
                            <input class="margin-all-normal enboxed short" v-model="group.commonParts.part2" :disabled="group.commonParts.part2 === null" placeholder="x" @input="updateCommonIp(group)"/>
                            <input class="margin-all-normal enboxed short" v-model="group.commonParts.part3" :disabled="group.commonParts.part3 === null" placeholder="x" @input="updateCommonIp(group)"/>
                            <input class="margin-all-normal enboxed short" v-model="group.commonParts.part4" :disabled="group.commonParts.part4 === null" placeholder="x" @input="updateCommonIp(group)"/>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col center" v-if="perPortVlan[0]">
                <Divider />

                <h2>Per port VLAN</h2>

                <div class="row center">
                    <Button icon="pi pi-minus"
                        @click="() => { if (!(perPortVlan[0].ports[0].id == '1')) {perPortVlan[0].ports.forEach((port: any) => port.id = `${Number(port.id) - 1}`)}}"
                    />

                    <Button icon="pi pi-plus"
                        @click="() => {if (!(perPortVlan[0].ports[0].id == '3')) {perPortVlan[0].ports.forEach((port: any) => port.id = `${Number(port.id) + 1}`)}}"
                        style="margin-left: 20px;"
                    />

                </div>

                <DataTable :value="perPortVlan[0].ports" dataKey="id"
                    :pt="{
                        table: { style: 'min-width: 20rem' }
                    }"
                >
                    <Column field="id" header="Port">
                        <template #body="{ data }">
                            <span>{{ data.id }}</span>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </Drawer>
        <h1>VLAN</h1>
        <!-- Show list of vlans from the config file, auto complete mac with the right equipement (filter name for the last group of letters) -->
        <!-- The autoconfigured vlans will be displayed below and each info can be edited (thus we use an input to display them)-->
        <div class="make-column" v-if="vlanIsAutoConfigured">
            <!-- On top right, add a congregate of the vlans appliance IPs: once the vlans are configured, a new set of 4 ip parts will be generated.
             that set will contain each part of the appliance IPs that are common to all vlans. If some parts differ, it'll be filled with ... and unable to be edited.
             When one of these part is edited, all the vlan appliance IPs will be updated with the new part. -->
            <h2>Auto configured VLANs</h2>

            <div class="col center" style="margin-top: 20px;" v-for="(vlan, index) in vlanAutoConfigured" :key="index">
                <Divider style="margin-top: 20px; width:300px" />
                <h3 style="margin: 10px;">{{ vlan.id }} | {{ vlan.payload[0].name }}</h3>
                <div style="align-items: flex-end;">
                    <div class="row" style="justify-content: flex-end;">
                        <h3 style="margin: 10px">Appliance IP - </h3>
                        <InputText v-model="vlan.payload[0].applianceIp" placeholder="Appliance IP" style="margin: 10px;"/>
                    </div>
                    <div class="row" style="justify-content: flex-end;">
                        <h3 style="margin: 10px;">Subnet - </h3>
                        <InputText v-model="vlan.payload[0].subnet" placeholder="Subnet" style="margin: 10px;"/>
                    </div>
                </div>
                <div class="col center" v-if="vlan.payload[1].fixedIpAssignments?.length > 0">
                    <Divider style="width:100px" />
                    <h3 style="margin-top: 10px;">Fixed IP assignments</h3>
                    <DataTable :value="vlan.payload[1].fixedIpAssignments" editMode="row" dataKey="serial"
                        :pt="{
                            table: { style: 'min-width: 50rem' }
                        }"
                    >
                        <Column field="ip" header="IP Address"></Column>
                        <Column field="name" header="Name"></Column>
                        <Column field="mac" header="MAC Address">
                            <template #body="{ data }">
                                <InputText v-model="data.mac" :class="{ existingMac: !data.autoMac }" style="padding: 4px;"/>
                                <!--i v-if="!data.autoMac" class="pi pi-exclamation-circle" style="margin-left: 10px; cursor: pointer; color: var(--p-indigo-500);" @click="toggleAutoMacHelp"></i>
                                <Popover ref="autoMacHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                                    <p>This mac address has been determined automatically, if it is wrong, you can modify it</p>
                                </Popover-->
                            </template>
                        </Column>
                    </DataTable>
                </div>
                <div v-else class="col center" style="margin-bottom: 20px;">
                    <Divider style="width:100px" />
                    <h3 style="margin: 10px;">No fixed IP assignments</h3>
                </div>
            </div>
        </div>
        <Button class="constant-width-150 constant-height-40" @click="confirm" style="margin-top: 30px;" :disabled="savingChanges">
            <v-progress-circular v-if="savingChanges" indeterminate color="white" width="3"></v-progress-circular>
            <p v-else>Save on Meraki</p>
        </Button>
        <div class="row center" style="margin-top: 20px;">
            <Button style="margin-right: 15px;" @click="goBack">Back</Button>
            <Button :disabled="!thisState" @click="validate">Next</Button>
        </div>
    </div>
</template>

<style scoped>
    .align-items-horizontally {
        display: flex;
        align-items: center;
        flex-direction: row;
    }

    .enboxed {
        border: 1px solid black;
        padding: 5px;
        border-radius: 4px;
    }

    .lateral-margin-normal {
        margin: 0 10px;
    }

    .lateral-margin-small {
        margin: 0 5px;
    }

    .lateral-margin-big {
        margin: 0 20px;
    }

    .margin-all-normal {
        margin: 10px;
    }

    .make-row {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .make-column {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    input.short {
        width: 50px;
    }

    .vlan-fields-section {
        border: 1px solid black;
        padding: 10px;
        border-radius: 4px;
    }

    .top-right-btn {
        position: fixed;
        top: 20px;
        right: 0;
    }

    .existingMac {
        box-shadow: 0 0 5px 0 var(--p-indigo-500);
    }
</style>
