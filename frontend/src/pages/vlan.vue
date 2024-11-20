<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { updateNetworkVlan } from '@/endpoints/networks/UpdateNetworkVlan'
import { createVlansIfNotExists } from '@/endpoints/networks/CreateVlansIfNotExists'
import { enableVlans } from '@/endpoints/networks/EnableVlans'
import { configurePerPortVlan } from '@/endpoints/actionBatches/ConfigurePerPortVlan'
import { getActionBatchStatus } from '@/endpoints/actionBatches/GetActionBatch'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'
import { createMac } from '@/utils/Misc'
import { maskIpWithSubnet, modifyIpWithoutChangingMask } from '@/utils/ipType'

import { useRouter, useRoute } from 'vue-router'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Drawer from 'primevue/drawer'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import Popover from 'primevue/popover';

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

console.log('Configuration: ', config)

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const vlanIsAutoConfigured = ref(false)
const vlanAutoConfigured = ref([])

const perPortVlan = ref([])

const moreOptions = ref(false)

let autoMac = createMac()

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

const toggleAutoMacHelp = (event) => {
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
        devices.addVlan(`${vlan.id}`)
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
    let formattedFixedAssignments = {}
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

    let createdVlans = await createVlansIfNotExists(newNetworkId.value, vlanAutoConfiguredFormatted)

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
    await updateNetworkVlan(newNetworkId.value, vlanAutoConfiguredFormatted)

    // update perPortVlan settings
    // for each perPortVlan in configuration.value, match the expectedEquipment with a device shortName
    // and add {serial: device.serial, config: perPortVlan[n]} to perPortVlan
    for (const perPortVlanConfig of config.perPortVlan) {
        console.log('[VLAN] perPortVlanConfig: ', perPortVlanConfig)
        console.log('Template configuration: ', config)
        console.log('Devices list: ', devicesList.value)
        for (const device of devicesList.value) {
            if (device.associationId === perPortVlanConfig.applianceName) {
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
});

const makeNewVlan = () => {
    const newId = vlanAutoConfigured.value.length + 1
    vlanAutoConfigured.value.push(
        {
            id: newId,
            payload: [
                {
                    name: 'New VLAN',
                    applianceIp: '',
                    subnet: ''
                },
                {
                    fixedIpAssignments: [],
                    reservedIpRanges: [],
                    dhcpOptions: []
                }
            ]
        }
    )
    makeNewIpAssignment(newId)
}

const makeNewIpAssignment = (vlanId: number) => {
    for (const vlan of vlanAutoConfigured.value) {
        if (vlan.id === vlanId) {
            vlan.payload[1].fixedIpAssignments.push({
                ip: '',
                name: '',
                mac: ''
            })
        }
    }
}

const deleteVlan = (vlanId: number) => {
    for (let i = 0; i < vlanAutoConfigured.value.length; i++) {
        if (vlanAutoConfigured.value[i].id === vlanId) {
            vlanAutoConfigured.value.splice(i, 1)
        }
    }
}

const deleteFixedIp = (vlanId: number, mac: string) => {
    console.log('[VLAN] Deleting fixed ip: ', vlanId, mac)
    for (const vlan of vlanAutoConfigured.value) {
        if (vlan.id === vlanId) {
            console.log('[VLAN] Found vlan: ', vlan)
            for (let i = 0; i < vlan.payload[1].fixedIpAssignments.length; i++) {
                // if the fixedIpAssignments has the mac in its body, delete it
                if (vlan.payload[1].fixedIpAssignments[i].mac === mac) {
                    console.log('[VLAN] Found fixed ip: ', vlan.payload[1].fixedIpAssignments[i])
                    vlan.payload[1].fixedIpAssignments.splice(i, 1)
                }
            }
        }
    }
}


const validate = () => {
    let path =  getRoutePath(configStore.nextPage());
    console.log('[VLAN] Next page: ', path)
    router.push(path)
}

const goBack = () => {
    router.push(getRoutePath(configStore.prevPage()));
}

onMounted(() => {
    configureVlans()
    // computeCommonIps()
    // console.log('[VLAN] commonIps: ', commonIps.value)
    computeIpsGroups()
})

</script>

<template>
    <div style="margin-top: 40px; margin-bottom: 60px">
        <Button icon="pi pi-chevron-left" @click="moreOptions = true" label="More" class="vpn-btn top-right-btn"/>

        <Drawer v-model:visible="moreOptions" header="Extra features" position="right" style="width: 500px;">

            <Divider />
            
            <div class="make-column" id="commonIps">
                <p>Common appliance IPs</p>
                <div v-for="(group, index) in commonIpsGroups" :key="index">
                    <div class="align-items-horizontally">
                        <span class="lateral-margin-small">Vlans</span>
                        <span class="lateral-margin-small" v-for="(vlan, index) in group.vlans" :key="index">{{ vlan }} </span>
                        <input class="margin-all-normal enboxed short" v-model="group.commonParts.part1" :disabled="group.commonParts.part1 === null" placeholder="x" @input="updateCommonIp(group)"/>
                        <input class="margin-all-normal enboxed short" v-model="group.commonParts.part2" :disabled="group.commonParts.part2 === null" placeholder="x" @input="updateCommonIp(group)"/>
                        <input class="margin-all-normal enboxed short" v-model="group.commonParts.part3" :disabled="group.commonParts.part3 === null" placeholder="x" @input="updateCommonIp(group)"/>
                        <input class="margin-all-normal enboxed short" v-model="group.commonParts.part4" :disabled="group.commonParts.part4 === null" placeholder="x" @input="updateCommonIp(group)"/>
                    </div>
                </div>
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
            <!--div class="make-column" v-for="(vlan, index) in vlanAutoConfigured" :key="index">
                <hr />
                <hr />
                <p>------------------------------------------------------------------------------------</p>
                <p>
                    {{ vlan.payload[0].name }}<br>
                    Id: {{ vlan.id }}<br>
                    Appliance IP: {{ vlan.payload[0].applianceIp }}<br>
                </p>
                <span>Subnet : </span>
                <input class="margin-all-normal enboxed" v-model="vlan.payload[0].subnet" placeholder="Subnet"/>
                <div class="vlan-fields-section">
                    <p>Fixed IP assignments</p>
                    <div v-for="(assignment, index) in vlan.payload[1].fixedIpAssignments" :key="index">
                        <div class="align-items-horizontally">
                            <input class="margin-all-normal enboxed" v-model="assignment.ip" placeholder="IP address"/>
                            <input class="margin-all-normal enboxed" v-model="assignment.name" placeholder="Name"/>
                            <input class="margin-all-normal enboxed" v-model="assignment.mac" placeholder="MAC"/>
                            <button class="margin-all-normal enboxed" @click="deleteFixedIp(vlan.id, assignment.mac)">Delete</button>
                        </div>
                    </div>
                </div>
                <div class="margin-all-normal make-column vlan-fields-section">
                    <p>Reserved IP ranges</p>
                    <table v-if="vlan.payload[1].reservedIpRanges.length > 0" class="margin-all-normal">
                        <tr>
                            <th>Start</th>
                            <th>End</th>
                            <th>Comment</th>
                        </tr>
                        <tr v-for="(range, index) in vlan.payload[1].reservedIpRanges" :key="index">
                            <td><input class="margin-all-normal enboxed" v-model="range.start" placeholder="Start"/></td>
                            <td><input class="margin-all-normal enboxed" v-model="range.end" placeholder="End"/></td>
                            <td><input class="margin-all-normal enboxed" v-model="range.comment" placeholder="Comment"/></td>
                        </tr>
                    </table>
                </div>
                <div class="margin-all-normal make-column vlan-fields-section">
                    <p>DHCP options</p>
                    <table v-if="vlan.payload[1].dhcpOptions.length > 0" class="margin-all-normal">
                        <tr>
                            <th>Code</th>
                            <th>Type</th>
                            <th>Value</th>
                        </tr>
                        <tr v-for="(option, index) in vlan.payload[1].dhcpOptions" :key="index">
                            <td><input class="margin-all-normal enboxed" v-model="option.code" placeholder="Code"/></td>
                            <td><input class="margin-all-normal enboxed" v-model="option.type" placeholder="Type"/></td>
                            <td><input class="margin-all-normal enboxed" v-model="option.value" placeholder="Value"/></td>
                        </tr>
                    </table>
                </div>
                <div class="margin-all-normal make-row">
                </div>
            </div>
            <hr />
            <p v-if="savingChanges">Saving changes...</p>
            <Button style="margin-bottom: 20px;" @click="confirm">Save on Meraki</Button>
            <div class="row center">
                <Button style="margin-right: 15px;" @click="goBack">Back</Button>
                <Button @click="validate">Next</Button>
            </div-->

            <div class="col center" style="margin-top: 20px;" v-for="(vlan, index) in vlanAutoConfigured" :key="index">
                <Divider style="margin-top: 20px; width:300px" />
                <div class="row center">
                    <h3 style="margin: 10px;">{{ vlan.payload[0].name }}</h3>
                    <Divider layout="vertical" />
                    <h3 style="margin: 10px;">Id - {{ vlan.id }}</h3>
                    <Divider layout="vertical" />
                    <h3 style="margin: 10px;">Appliance IP - {{ vlan.payload[0].applianceIp }}</h3>
                </div>
                <div class="row center">
                    <h3 style="margin: 10px;">Subnet - </h3>
                    <InputText v-model="vlan.payload[0].subnet" placeholder="Subnet" style="margin: 10px;"/>
                </div>
                <div class="col center" v-if="vlan.payload[1].fixedIpAssignments?.length > 0">
                    <Divider style="width:100px" />
                    <h3 style="margin-top: 10px;">Fixed IP assignments</h3>
                    <DataTable :value="vlan.payload[1].fixedIpAssignments" editMode="row" dataKey="serial"
                        :pt="{
                            table: { style: 'min-width: 50rem' },
                            column: {
                                bodycell: ({ state }) => ({
                                    style:  state['d_editing']&&'padding-top: 0.75rem; padding-bottom: 0.75rem'
                                })
                            }
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
