<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { fixIpAssignments } from '../endpoints/actionBatches/FixIpAssignments'
import { getActionBatchStatus } from '../endpoints/actionBatches/GetActionBatch'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'

import { useRouter, useRoute } from 'vue-router'
import { get } from '@vueuse/core'

const router = useRouter()
const route = useRoute()


const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const savingChanges = ref(false)
const changesSaved = ref(false)

/**
 * Auto fix ip addresses for each device in the network.
 * The config file contains the expected configuration for each device in config.fixedIp[n]
 */

const fixedIpAssignments = ref([] as any[])
const fixedIpDone = ref(false)

const fixIp = useBoolStates([],[],async () => {
    // load fixed ip assignments from config file
    const configFixedIp = config.fixedAssignments

    console.log('[FIXED IP] Config fixed ip: ', configFixedIp)
    console.log('[FIXED IP] Devices list: ', devicesList.value)

    // for each element in configFixedIp, find the corresponding device in devicesList (by configFixedIp[n].expectedEquipment === devicesList[n].shortName)
    for (let i = 0; i < configFixedIp.length; i++) {
        const device = devicesList.value.find((device: { associationId: string }) => device.associationId === configFixedIp[i].expectedEquipment)
        if (device) {
            /**
             * If found, push all the fields except expectedEquipment to fixedIpAssignment
             */

            // if useDhcp is defined and useDhcp.use is true, set the configFixedIp[i].config.vlan to useDhcp.vlan
            console.log('[FIXED IP] testing useDhcp: ', configFixedIp[i].useDhcp)
            if (configFixedIp[i].useDhcp && configFixedIp[i].useDhcp.use) {
                console.log('[FIXED IP] Using DHCP for device: ', device.name)
                configFixedIp[i].config.vlan = configFixedIp[i].useDhcp.vlan
            }

            fixedIpAssignments.value.push({
                name: device.name,
                serial: device.serial,
                useDhcp: configFixedIp[i].useDhcp,
                config: configFixedIp[i].config
            })
        }
    }
}, fixedIpDone);

const validate = useBoolStates([savingChanges],[],async () => {
    // validate the fixed ip assignments
    console.log('[FIXED IP] Validating fixed ip assignments: ', fixedIpAssignments.value)

    // launch action batch to fix ip addresses
    const actionBatchId = await fixIpAssignments(fixedIpAssignments.value, orgId.value)

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const response = await getActionBatchStatus(actionBatchId.id, orgId.value)
        if (response.status.completed) {
            console.log('[FIXED IP] Action batch completed: ', response)
            break
        } else {
            console.log('[FIXED IP] Action batch not completed yet: ', response)
        }
    }
}, changesSaved);

const goBack = () => {
    router.push(getRoutePath(configStore.prevPage()));
}

const nextPage = () => {
    router.push(getRoutePath(configStore.nextPage()));
}

onMounted(() => {
    fixIp()
    console.log('[FIXED IP] Fixed IP assignments: ', fixedIpAssignments.value)
})
</script>

<template>
  <div>
    <h1>Fixed IP</h1>
    <div v-if="fixedIpDone">
      <h2>Fixed IP assignments</h2>
        <!-- for each equipment, table with column : ip, mask, vlan, gateway, primaryDns, secondaryDns.
         Values contained in input fields, if a field doesn't exist, fill the input with "None"-->
        <table class="space-elts">
            <thead>
                <tr>
                    <th> </th>
                    <th>Equipment</th>
                    <th>IP</th>
                    <th>Mask</th>
                    <th>VLAN</th>
                    <th>Gateway</th>
                    <th>Primary DNS</th>
                    <th>Secondary DNS</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="assignment in fixedIpAssignments">
                    <td>
                        <span v-if="assignment.useDhcp?.use">Using DHCP</span>
                    </td>
                    <td>
                        <span>{{ assignment.name }}</span>
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.ip" :disabled="assignment.useDhcp?.use"/>
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.mask" :disabled="assignment.useDhcp?.use"/>
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.vlan"/>
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.gateway" :disabled="assignment.useDhcp?.use"/>
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.primaryDns" :disabled="assignment.useDhcp?.use"/>
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.secondaryDns" :disabled="assignment.useDhcp?.use"/>
                    </td>
                </tr>
            </tbody>
        </table>
        <button @click="validate">Validate</button>
        <p v-if="savingChanges">Saving changes...</p>
        <p v-if="changesSaved">Changes saved</p>
        <button @click="goBack">Back</button>
        <button @click="nextPage">Next</button>
    </div>
  </div>
</template>

<style scoped>
    .space-elts {
        margin-top: 20px;
    }

    .space-elts th {
        padding: 10px;
    }

    .space-elts td {
        padding: 10px;
    }
</style>
