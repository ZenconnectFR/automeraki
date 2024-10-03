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

    let autoMac = createMac()

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
                        fixedIpAssignments: {}
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
                    vlanAutoConfigured.value[vlanAutoConfigured.value.length - 1].payload[1].fixedIpAssignments[device.mac] = {
                        ip: assignment.ip,
                        name: assignment.expectedEquipment
                    }
                    found = true
                    console.log('[VLAN] Device found: ', device)
                }
            }
            if (!found) {
                console.log('[VLAN] Device not found, adding placeholder: ', autoMac, ' for ', assignment.expectedEquipment)
                // add a placeholder device to the vlanAutoConfigured payload with mac as key
                vlanAutoConfigured.value[vlanAutoConfigured.value.length - 1].payload[1].fixedIpAssignments[autoMac] = {
                    ip: assignment.ip,
                    name: assignment.expectedEquipment
                }
                autoMac = createMac(autoMac)
            }
        }
    }

    for (const vlan of vlanAutoConfigured.value) {
        console.log('[VLAN] Adding vlan: ', vlan.id, " to devices store")
        devices.addVlan(`${vlan.id}`)
    }

    vlanIsAutoConfigured.value = true
}

const preEnableVlans = async() => {
    console.log('[VLAN] Enabling vlans')
    await enableVlans(newNetworkId.value)
}

const confirm = useBoolStates([savingChanges],[],async () => {
    // enable vlans
    await preEnableVlans()

    let createdVlans = await createVlansIfNotExists(newNetworkId.value, vlanAutoConfigured.value)

    // filter payload[0] part out of vlanAutoConfigured when vlan id is in createdVlans
    for (const vlan of vlanAutoConfigured.value) {
        for (const createdVlan of createdVlans) {
            if (vlan.id === createdVlan) {
                vlan.payload.shift()
            }
        }
    }

    // Save changes
    console.log('[VLAN] Saving changes')
    await updateNetworkVlan(newNetworkId.value, vlanAutoConfigured.value)

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
            <div v-for="vlan in vlanAutoConfigured" :key="vlan.id">
                <h3>{{vlan.payload[0].name}}</h3>
                <div v-for="(assignment, mac) in vlan.payload[1].fixedIpAssignments" :key="mac">
                    <div class="align-items-horizontally">
                        <input class="margin-all-normal enboxed" v-model="assignment.ip" placeholder="IP address"/>
                        <input class="margin-all-normal enboxed" v-model="assignment.name" placeholder="Name"/>
                        <p class="margin-all-normal enboxed">{{mac}}</p>
                    </div>
                </div>
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
