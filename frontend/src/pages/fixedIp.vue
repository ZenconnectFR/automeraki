<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { useNextStatesStore } from '@/stores/nextStates'
import { storeToRefs } from 'pinia'

import { fixIpAssignments } from '../endpoints/actionBatches/FixIpAssignments'
import { getActionBatchStatus } from '../endpoints/actionBatches/GetActionBatch'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'

import { useRouter, useRoute } from 'vue-router'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Divider from 'primevue/divider'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const router = useRouter()
const route = useRoute()


const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()
const nextStates = useNextStatesStore()

const { currentPageConfig, currentPageIndex } = storeToRefs(configStore)
let config = currentPageConfig.value
let thisState = nextStates.getState(currentPageIndex.value)

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const savingChanges = ref(false)
const changesSaved = ref(false)

const editingRows = ref([])
const originalData = ref({})

const onRowEditSave = async (event: any) => {
    const { newData, index } = event
    console.log('[FIXED IP] Saving row edit: ', newData, index)
    Object.assign(fixedIpAssignments.value[index], newData)
    console.log('[FIXED IP] New fixed ip assignment: ', fixedIpAssignments.value[index])
}

const onRowEditCancel = (event: any) => {
    console.log('[FIXED IP] Cancel row edit: ', event, 'editingRows: ', editingRows.value)

    const { data, index } = event

    Object.assign(data, originalData.value[index])
    console.log('[FIXED IP] Restored data: ', data)

    // delete the original data
    delete originalData.value[index]
}

const onRowEditInit = (event: any) => {
    console.log('[FIXED IP] Init row edit: ', event, 'editingRows: ', editingRows.value)

    const { data, index } = event
    originalData.value[index] = JSON.parse(JSON.stringify(data))
    console.log('[FIXED IP] Original data: ', originalData.value[index])
}

/**
 * Auto fix ip addresses for each device in the network.
 * The config file contains the expected configuration for each device in config.fixedIp[n]
 */

const fixedIpAssignments = ref([] as any[])
const fixedIpDone = ref(false)

const fixIp = useBoolStates([],[],async () => {
    // load fixed ip assignments from config file
    const configFixedIp = config.fixedAssignments
    const dhcpAssignments = config.dhcpAssignments

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
                name: device.associationName,
                serial: device.serial,
                useDhcp: configFixedIp[i].useDhcp?.use ? configFixedIp[i].useDhcp : { use: false, vlan: configFixedIp[i].config.vlan },
                config: configFixedIp[i].config
            })
        }
    }

    // for all reamining devices in devicesList that are not of router type, push them to fixedIpAssignment with useDhcp.use = true and :
    // if they are found in dhcpAssignments.static.equipements, set the vlan to dhcpAssignments.static.vlan, else set the vlan to dhcpAssignments.default.vlan
    for (let i = 0; i < devicesList.value.length; i++) {
        const device = devicesList.value[i]
        if (device.type !== 'router') {
            if (!fixedIpAssignments.value.find((assignment: { serial: string }) => assignment.serial === device.serial)) {
                console.log('[FIXED IP] Device not found in fixed ip assignments: ', device.name)
                let isStatic = false
                let i = 0
                for (const staticAssignment of dhcpAssignments.static) {
                    console.log('[FIXED IP] Testing static assignment: ', staticAssignment)
                    if (staticAssignment.equipments.includes(device.associationId)) {
                        isStatic = true
                        break
                    }
                    i++
                }

                const vlan = isStatic ? dhcpAssignments.static[i].vlan : dhcpAssignments.default.vlan

                fixedIpAssignments.value.push({
                    name: device.associationName,
                    serial: device.serial,
                    useDhcp: { use: true, vlan },
                    config: {
                        ip: 'None',
                        mask: 'None',
                        vlan,
                        gateway: 'None',
                        primaryDns: 'None',
                        secondaryDns: 'None'
                    }
                })
            }
        }
    }
}, fixedIpDone);

const validate = useBoolStates([savingChanges],[],async () => {
    // validate the fixed ip assignments
    console.log('[FIXED IP] Validating fixed ip assignments: ', fixedIpAssignments.value)

    // launch action batch to fix ip addresses
    const response = await fixIpAssignments(fixedIpAssignments.value, orgId.value)

    console.log('[FIXED IP] Fix ip response: ', response)

    toast.add({ severity: 'success', summary: 'Fixed IP', detail: 'Fixed IP addresses saved successfully', life: 3000 })

    thisState = true;
    nextStates.setStateTrue(currentPageIndex.value)
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
  <div style="margin-top: 40px; margin-bottom: 60px;" class="col center">
    <Toast position="top-right" />
    <h1>Fixed IP</h1>
    <Divider style="margin-bottom: 20px; width: 250px;" />
    <div v-if="fixedIpDone" class="col">
      <h2>Fixed IP assignments</h2>
        <DataTable :value="fixedIpAssignments" tableStyle="min-width: 50rem" editMode="row"
            @row-edit-save="onRowEditSave" v-model:editingRows="editingRows" dataKey="serial"
            @row-edit-cancel="onRowEditCancel"
            @row-edit-init="onRowEditInit"
            :pt="{
                table: { style: 'min-width: 70rem' },
                column: {
                    bodycell: ({ state }) => ({
                        style:  state['d_editing']&&'padding-top: 0.75rem; padding-bottom: 0.75rem'
                    })
                }
            }"
        >
            <Column field="useDhcp" header="DHCP">
                <template #body="{ data }">
                    <span v-if="data.useDhcp?.use">Yes</span>
                    <span v-else>No</span>
                </template>
                <template #editor="{ data, field }">
                    <Checkbox v-model="data[field].use" binary/>
                </template>
            </Column>
            <Column field="name" header="Equipment"></Column>
            <Column field="config" header="IP" style="max-width: 150px;">
                <template #body="{ data} ">
                    <span v-if="data.useDhcp?.use"></span>
                    <span v-else>{{ data.config.ip }}</span>
                </template>
                <template #editor="{ data, field }">
                    <InputText class="input-text" v-model="data[field].ip" :disabled="data.useDhcp?.use"/>
                </template>
            </Column>
            <Column field="config" header="Mask" style="max-width: 150px;">
                <template #body="{ data} ">
                    <span v-if="data.useDhcp?.use"></span>
                    <span v-else>{{ data.config.mask }}</span>
                </template>
                <template #editor="{ data, field }">
                    <InputText class="input-text" v-model="data[field].mask" :disabled="data.useDhcp?.use"/>
                </template>
            </Column>
            <Column field="config" header="VLAN" style="max-width: 150px;">
                <template #body="{ data} ">
                    <span>{{ data.config.vlan }}</span>
                </template>
                <template #editor="{ data, field }">
                    <InputText style="max-width: 65px;" v-model="data[field].vlan"/>
                </template>
            </Column>
            <Column field="config" header="Gateway" style="max-width: 150px;">
                <template #body="{ data} ">
                    <span v-if="data.useDhcp?.use"></span>
                    <span v-else>{{ data.config.gateway }}</span>
                </template>
                <template #editor="{ data, field }">
                    <InputText class="input-text" v-model="data[field].gateway" :disabled="data.useDhcp?.use"/>
                </template>
            </Column>
            <Column field="config" header="Primary DNS" style="max-width: 200px;">
                <template #body="{ data} ">
                    <span v-if="data.useDhcp?.use"></span>
                    <span v-else>{{ data.config.primaryDns }}</span>
                </template>
                <template #editor="{ data, field }">
                    <InputText class="input-text" v-model="data[field].primaryDns" :disabled="data.useDhcp?.use"/>
                </template>
            </Column>
            <Column field="config" header="Secondary DNS" style="max-width: 200px;">
                <template #body="{ data} ">
                    <span v-if="data.useDhcp?.use"></span>
                    <span v-else>{{ data.config.secondaryDns }}</span>
                </template>
                <template #editor="{ data, field }">
                    <InputText class="input-text" v-model="data[field].secondaryDns" :disabled="data.useDhcp?.use"/>
                </template>
            </Column>
            <Column rowEditor headerStyle="width: 7rem" style="width: 10%;"></Column>
        </DataTable>
        <!--Button @click="addFixedIpAssignment" style="align-self: flex-end !important; margin-right: 5% !important;" class="plus-btn">
            <i class="pi pi-plus"></i>
        </Button-->
    </div>
    <div style="margin-top: 10px; margin-bottom: 20px;"></div>
    <Button class="constant-width-150 constant-height-40" @click="validate" :disabled="savingChanges">
        <span v-if="!savingChanges">Save on Meraki</span>
        <v-progress-circular v-else indeterminate color="white" width="3"></v-progress-circular>
    </Button>
    <div class="row center space-elts">
        <Button style="margin-right: 15px;" @click="goBack">Back</Button>
        <Button :disabled="!thisState" @click="nextPage">Next</Button>
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

    .input-text {
        max-width: 130px;
        padding: 4px;
    }

    .plus-btn {
        border-radius: 0;
        border-bottom-left-radius: 5px;
        border-bottom-right-radius: 5px;
        background-color: #fff;
        color: var(--p-button-text-secondary-color);
        /* no border at the top, 1px solid black for the rest */
        border-top: none !important;
        border: 2px solid #e5e7eb;
    }
</style>
