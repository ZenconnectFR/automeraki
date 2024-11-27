<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { blinkDevice } from '@/endpoints/devices/BlinkDevice'
import { getNetworkDevices } from '@/endpoints/networks/GetNetworkDevices'

import { useRoute, useRouter } from 'vue-router'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'

import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const toast = useToast()

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { networkId } = storeToRefs(ids)
const { currentPageConfig, currentPageIndex } = storeToRefs(configStore)
let config = currentPageConfig.value

const devicesList = ref([])

const loaded = ref(false)

const populateDevices = async () => {
    devicesList.value = await getNetworkDevices(networkId.value)
    loaded.value = true
}

const blink = async (device: any) => {
    await blinkDevice(device.serial)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Device blinked' })
}

onMounted(() => {
    populateDevices()
})

</script>

<template>
    <div class="dark-overlay"></div>
    <div style="margin-top: 60px; margin-bottom: 60px;">
        <h1 style="margin-bottom: 60px;">Blink Devices</h1>
        <v-progress-circular v-if="!loaded" indeterminate></v-progress-circular>
        <div v-else>
            <DataTable :value="devicesList" tableStyle="min-width: 50rem">
                <Column field="serial" header="Serial"></Column>
                <Column field="name" header="Name"></Column>
                <Column field="model" header="Model"></Column>  
                <Column field="actions" header="">
                    <template #body="{ data }">
                        <Button @click="blink(data)" class="eerie-button">Blink</Button>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
