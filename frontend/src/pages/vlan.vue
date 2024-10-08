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

import { useBoolStates } from '@/utils/Decorators'

import { createMac } from '@/utils/Misc'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { configuration } = storeToRefs(configStore)

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const vlanIsAutoConfigured = ref(false)
const vlanAutoConfigured = ref([])

const perPortVlan = ref([])

let autoMac = createMac()

// UI states
const savingChanges = ref(false)

/**
 * Auto configure vlan:
 * Retrieve the list of devices from the devices store and compare the expected equipment with the actual equipment last group of letters in the name
 * When an equipement is found, add {name: nameFromStore, ip: ipFromConfig, mac: macFromStore} to vlanAutoConfigured
 */

const configureVlans = () => {
    let devicesListV = devicesList.value
    let vlans = configuration.value.vlan

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
                        fixedIpAssignments: []
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
                        mac: device.mac
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
                    mac: autoMac
                })
                autoMac = createMac(autoMac)
            }
        }
    }

    for (const vlan of vlanAutoConfigured.value) {
        console.log('[VLAN] Adding vlan: ', vlan.id, " to devices store")
        devices.addVlan(`${vlan.id}`)
    }

    // sort by id
    vlanAutoConfigured.value.sort((a, b) => a.id - b.id)

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
                    fixedIpAssignments: formatFixedAssignments(vlan.payload[1].fixedIpAssignments)
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
    for (const perPortVlanConfig of configuration.value.perPortVlan) {
        console.log('[VLAN] perPortVlanConfig: ', perPortVlanConfig)
        console.log('Template configuration: ', configuration.value)
        for (const device of devicesList.value) {
            if (device.shortName === perPortVlanConfig.expectedEquipment) {
                perPortVlan.value.push({
                    ports: perPortVlanConfig.ports
                })
            }
        }
    }

    // save perPortVlan settings with endpoint
    console.log('[VLAN] Saving perPortVlan settings : ', perPortVlan.value)
    const firstResponse =  await configurePerPortVlan(perPortVlan.value, orgId.value, newNetworkId.value)
    // is an action batch, loop until completed
    if (!firstResponse.status.completed) {
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            const response = await getActionBatchStatus(firstResponse.id, orgId.value)
            if (response.status.completed) {
                console.log('[VLAN] Action batch completed: ', response)
                break
            }
        }
    }
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
                    fixedIpAssignments: []
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
    router.push('/ports')
}

const goBack = () => {
    router.push('/fixed-ip')
}

onMounted(() => {
    configureVlans()
    console.log('[VLAN] perPortVlan: ', perPortVlan)
})

</script>

<template>
    <div>
        <h1>VLAN</h1>
        <!-- Show list of vlans from the config file, auto complete mac with the right equipement (filter name for the last group of letters) -->
        <!-- The autoconfigured vlans will be displayed below and each info can be edited (thus we use an input to display them)-->
        <div class="make-column" v-if="vlanIsAutoConfigured">
            <h2>Auto configured VLANs</h2>
            <div v-for="(vlan, index) in vlanAutoConfigured" :key="index">
                <hr />
                <input class="margin-all-normal enboxed" v-model="vlan.payload[0].name" placeholder="VLAN name"/>
                <p>ID</p>
                <input class="margin-all-normal enboxed" v-model="vlan.id" placeholder="VLAN ID" type="number"/>
                <p>Appliance IP</p>
                <input class="margin-all-normal enboxed" v-model="vlan.payload[0].applianceIp" placeholder="Appliance IP"/>
                <p>Subnet</p>
                <input class="margin-all-normal enboxed" v-model="vlan.payload[0].subnet" placeholder="Subnet"/>
                <div v-for="(assignment, index) in vlan.payload[1].fixedIpAssignments" :key="index">
                    <div class="align-items-horizontally">
                        <input class="margin-all-normal enboxed" v-model="assignment.ip" placeholder="IP address"/>
                        <input class="margin-all-normal enboxed" v-model="assignment.name" placeholder="Name"/>
                        <input class="margin-all-normal enboxed" v-model="assignment.mac" placeholder="MAC"/>
                        <button class="margin-all-normal enboxed" @click="deleteFixedIp(vlan.id, assignment.mac)">Delete</button>
                    </div>
                </div>
                <div class="margin-all-normal make-row">
                    <button @click="makeNewIpAssignment(vlan.id)">Add new IP assignment</button>
                    <button @click="deleteVlan(vlan.id)">Delete VLAN</button>
                </div>
            </div>
            <hr />
            <div class="margin-all-normal make-row">
                <button @click="makeNewVlan">Add new VLAN</button>
            </div>
            <p v-if="savingChanges">Saving changes...</p>
            <button @click="confirm">Save changes</button>
            <div class="margin-all-normal make-row">
                <button @click="goBack">Back</button>
                <button @click="validate">Next</button>
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
</style>
