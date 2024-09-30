<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useStatesStore } from '@/stores/states'
import { storeToRefs } from 'pinia'

import { updateNetworkVlan } from '@/endpoints/networks/UpdateNetworkVlan'
import { createVlansIfNotExists } from '@/endpoints/networks/CreateVlansIfNotExists'
import { enableVlans } from '@/endpoints/networks/EnableVlans'

import { createMac } from '@/utils/Misc'

const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const vlanIsAutoConfigured = ref(false)
const vlanAutoConfigured = ref([])

// UI states
const savingChanges = ref(false)

/* import config file (@/assets/test-config.json)
{
    "vlan": [
        {
            "id": 1,
            "name": "VLAN 1",
            "applianceIp": "127.0.0.1",
            "subnet": "127.0.0.0/24",
            "fixedAssignments": [
                {
                    "expectedEquipment": "S1",
                    "ip": "127.0.0.2"
                },
                {
                    "expectedEquipment": "S2",
                    "ip": "127.0.0.3"
                }
            ]
        }
    ]
}
 */

import * as configJson from '@/assets/test-conf.json'
const config = ref(configJson)


/**
 * Auto configure vlan:
 * Retrieve the list of devices from the devices store and compare the expected equipment with the actual equipment last group of letters in the name
 * When an equipement is found, add {name: nameFromStore, ip: ipFromConfig, mac: macFromStore} to vlanAutoConfigured
 */

const configureVlans = () => {
    let devices = devicesList.value
    let vlans = config.value.vlan

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
            for (const device of devices) {
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
    vlanIsAutoConfigured.value = true
}

const preEnableVlans = async() => {
    console.log('[VLAN] Enabling vlans')
    await enableVlans(newNetworkId.value)
}

const confirm = async () => {
    // enable vlans
    savingChanges.value = true
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

    savingChanges.value = false
}

const validate = () => {
    alert('VLANs have been configured')
}

const goBack = () => {
    states.setNamingDone(false)
    states.setVlanDone(false)
}

onMounted(() => {
    configureVlans()
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
