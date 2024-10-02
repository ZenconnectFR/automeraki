<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { fixIpAssignments } from '../endpoints/actionBatches/FixIpAssignments'
import { getActionBatchStatus } from '../endpoints/actionBatches/GetActionBatch'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()


const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { configuration } = storeToRefs(configStore)

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

const fixIp = async () => {
    // load fixed ip assignments from config file
    console.log('[FIXED IP] config: ', configuration)
    const configFixedIp = configuration.value.fixedIp

    console.log('[FIXED IP] configFixedIp: ', configFixedIp)

    // for each element in configFixedIp, find the corresponding device in devicesList (by configFixedIp[n].expectedEquipment === devicesList[n].shortName)
    for (let i = 0; i < configFixedIp.length; i++) {
        const device = devicesList.value.find((device: { shortName: string }) => device.shortName === configFixedIp[i].expectedEquipment)
        if (device) {
            console.log('[FIXED IP] device found: ', device)
            console.log('[FIXED IP] configFixedIp[i]: ', configFixedIp[i])
            /**
             * If found, push all the fields except expectedEquipment to fixedIpAssignment
             */
            fixedIpAssignments.value.push({
                name: device.name,
                serial: device.serial,
                config: configFixedIp[i].config
            })
        }
    }

    // set fixedIpDone to true
    fixedIpDone.value = true
}

const validate = async () => {
    // validate the fixed ip assignments
    console.log('[FIXED IP] Validating fixed ip assignments: ', fixedIpAssignments.value)

    // launch action batch to fix ip addresses
    savingChanges.value = true
    const actionBatchId = await fixIpAssignments(fixedIpAssignments.value, orgId.value)

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const response = await getActionBatchStatus(actionBatchId.id, orgId.value)
        if (response.status.completed) {
            console.log('[FIXED IP] Action batch completed: ', response)
            break
        } else {
            console.log('[FIXED IP] Action batch not completed yet: ', response)
        }
    }

    // move to the next page
    changesSaved.value = true
    savingChanges.value = false
}

const goBack = () => {
    router.push('/naming')
}

const nextPage = () => {
    router.push('/vlan')
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
                    <td> {{ assignment.name }} </td>
                    <td>
                        <input type="text" v-model="assignment.config.ip" :disabled="assignment.config.ip === undefined">
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.mask" :disabled="assignment.config.mask === undefined">
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.vlan" :disabled="assignment.config.vlan === undefined">
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.gateway" :disabled="assignment.config.gateway === undefined">
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.primaryDns" :disabled="assignment.config.primaryDns === undefined">
                    </td>
                    <td>
                        <input type="text" v-model="assignment.config.secondaryDns" :disabled="assignment.config.secondaryDns === undefined">
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
