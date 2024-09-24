<script setup>
import { ref, onMounted } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useStatesStore } from '@/stores/states'
import { storeToRefs } from 'pinia'

const ids = useIdsStore()
const devices = useDevicesStore()
const states = useStatesStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const vlanIsAutoConfigured = ref(false)
const vlanAutoConfigured = ref([])

/* import config file (../assets/test-config.json)
{
    "vlan": [
        {
            "id": 1,
            "name": "VLAN 1",
            "subnet": "127.0.0.1",
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
import * as configJson from '../assets/test-conf.json'
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

    for (const vlan of vlans) {
        for (const assignment of vlan.fixedAssignments) {
            for (const device of devices) {
                if (device.name.includes(assignment.expectedEquipment)) {
                    vlanAutoConfigured.value.push({
                        name: device.name,
                        ip: assignment.ip,
                        mac: device.mac
                    })
                }
            }
        }
    }
    vlanIsAutoConfigured.value = true
}

const confirm = () => {
    // TODO: call enpoint to save the changes
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
        <div v-if="vlanIsAutoConfigured">
            <h2>Auto configured VLANs</h2>
            <div v-for="vlan in vlanAutoConfigured" :key="vlan.mac">
                <input v-model="vlan.name" type="text" placeholder="Name"/>
                <input v-model="vlan.ip" type="text" placeholder="IP"/>
                <input v-model="vlan.mac" type="text" placeholder="MAC"/>
            </div>
            <button @click="confirm">Save changes</button>
        </div>
    </div>
</template>

<style scoped>
</style>
