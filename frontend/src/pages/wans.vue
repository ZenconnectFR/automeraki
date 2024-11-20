<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { enableWan } from '../endpoints/devices/EnableWan'

import { useBoolStates } from '@/utils/Decorators'
import Dropdown from '@/components/Dropdown.vue'
import { getRoutePath } from '@/utils/PageRouter'

import { useRouter, useRoute } from 'vue-router'
import { fixIpAssignments } from '../endpoints/actionBatches/FixIpAssignments'
import { updateWans } from '../endpoints/devices/UpdateWans'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)
const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const savingChanges = ref(false)
const changesSaved = ref(false)
const loaded = ref(false)

const validWan1 = ref(true)
const validWan2 = ref(true)
const sameWan1IpGateway = ref(false)
const sameWan2IpGateway = ref(false)

// templates have multiple configs for each WAN, so we add each of them
interface WanConfig {
    name: string;
    auto: boolean;
    ip: string;
    mask: string;
    gateway: string;
    primaryDns: string;
    secondaryDns: string;
}

const wan1config = ref([] as WanConfig[])
const useWan2 = ref(false)
const wan2config = ref([] as WanConfig[])

const selectedWan1Index = ref(0)
const selectedWan1Name = ref('')
const selectedWan2Index = ref(0)
const selectedWan2Name = ref('')

const wan1options = ref([] as string[])
const wan2options = ref([] as string[])

const configureWans = () => {
    let wan1 = config.wan1
    let wan2 = config.wan2

    console.log('[WANS] devices: ', devices)
    console.log('[WANS] wan1: ', wan1)
    console.log('[WANS] wan2: ', wan2)

    for (const config of wan1) {
        let configToAdd = {
            name: config.name,
            auto: config.auto,
            ip: "",
            mask: "",
            gateway: "",
            primaryDns: "",
            secondaryDns: "",
        }
        // only fill in the info if config.auto is false
        if (!config.auto) {
            configToAdd.ip = config.wanIp
            configToAdd.mask = config.mask
            configToAdd.gateway = config.gateway
            configToAdd.primaryDns = config.primaryDns
            configToAdd.secondaryDns = config.secondaryDns
        }

        wan1config.value.push(configToAdd)
        wan1options.value.push(config.name)
    }

    // set the selected wan1 config to the first one
    selectedWan1Name.value = wan1options.value[0]
    console.log('[WANS] Wan1 selected: ', selectedWan1Name.value)

    // repeat for wan2
    for (const config of wan2) {
        let configToAdd = {
            name: config.name,
            auto: config.auto,
            ip: "",
            mask: "",
            gateway: "",
            primaryDns: "",
            secondaryDns: "",
        }
        // only fill in the info if config.auto is false
        if (!config.auto) {
            configToAdd.ip = config.wanIp
            configToAdd.mask = config.mask
            configToAdd.gateway = config.gateway
            configToAdd.primaryDns = config.primaryDns
            configToAdd.secondaryDns = config.secondaryDns
        }

        wan2config.value.push(configToAdd)
        wan2options.value.push(config.name)
    }

    // set the selected wan2 config to the first one
    selectedWan2Name.value = wan2options.value[0]
}

const setWan1Index = (option: string) => {
    // find the index of the selected option
    let index = wan1options.value.indexOf(option)
    selectedWan1Index.value = index
    selectedWan1Name.value = option
}

const setWan2Index = (option: string) => {
    // find the index of the selected option
    let index = wan2options.value.indexOf(option)
    selectedWan2Index.value = index
    selectedWan2Name.value = option
}

const goBack = () => {
    router.push(getRoutePath(configStore.prevPage()));
}

const validate = useBoolStates([savingChanges],[changesSaved],async () => {
    // update the wans :
    /**
     * if wan1config[selectedWan1Index].auto is true, don't add anything to the final payload
     * if wan1config[selectedWan1Index].auto is false, add the config to the final payload
     *
     * if useWan2 is true, activate wan2 and repeat the process
     */

    // update ui states
    validWan1.value = true
    validWan2.value = true
    sameWan1IpGateway.value = false
    sameWan2IpGateway.value = false

    interface WanPayload {
        use: boolean;
        ip?: string;
        mask?: string;
        gateway?: string;
        primaryDns?: string;
        secondaryDns?: string;
    }

    let payload: { wan1: WanPayload; wan2: WanPayload } = {
        wan1: {
            use: false
        },
        wan2: {
            use: false
        }
    }

    // get router serial for endpoints
    let routerSerial = devicesList.value.find((device: { type: string }) => device.type === 'router').serial

    if (!wan1config.value[selectedWan1Index.value].auto) {
        console.log('[WANS] Wan1 config: ', wan1config.value[selectedWan1Index.value])

        // Check if ip and gateway have been filled in
        if (wan1config.value[selectedWan1Index.value].ip === "" || wan1config.value[selectedWan1Index.value].gateway === "") {
            validWan1.value = false;
            console.error('[WANS] Wan1 config not filled in')
            return
        }

        // check id ip and gateway are the same
        if (wan1config.value[selectedWan1Index.value].ip === wan1config.value[selectedWan1Index.value].gateway) {
            sameWan1IpGateway.value = true;
            console.error('[WANS] Wan1 ip and gateway are the same')
            return
        }

        // add the config to the final payload
        payload.wan1 = {
            use: true,
            ip: wan1config.value[selectedWan1Index.value].ip,
            mask: wan1config.value[selectedWan1Index.value].mask,
            gateway: wan1config.value[selectedWan1Index.value].gateway,
            primaryDns: wan1config.value[selectedWan1Index.value].primaryDns,
            secondaryDns: wan1config.value[selectedWan1Index.value].secondaryDns
        };
    }

    // if useWan2 is true, direcly enable wan2
    if (useWan2.value) {
        // enable wan2
        let response = await enableWan(routerSerial, 2)
        console.log('[WANS] Wan2 enabled: ', response)

        if (!wan2config.value[selectedWan2Index.value].auto) {
            console.log('[WANS] Wan2 config: ', wan2config.value[selectedWan2Index.value])

            // Check if ip and gateway have been filled in
            if (wan2config.value[selectedWan2Index.value].ip === "" || wan2config.value[selectedWan2Index.value].gateway === "") {
                validWan2.value = false;
                console.error('[WANS] Wan2 config not filled in')
                return
            }

            // check id ip and gateway are the same
            if (wan2config.value[selectedWan2Index.value].ip === wan2config.value[selectedWan2Index.value].gateway) {
                sameWan2IpGateway.value = true;
                console.error('[WANS] Wan2 ip and gateway are the same')
                return
            }

            // add the config to the final payload
            payload.wan2 = {
                use: true,
                ip: wan2config.value[selectedWan2Index.value].ip,
                mask: wan2config.value[selectedWan2Index.value].mask,
                gateway: wan2config.value[selectedWan2Index.value].gateway,
                primaryDns: wan2config.value[selectedWan2Index.value].primaryDns,
                secondaryDns: wan2config.value[selectedWan2Index.value].secondaryDns
            };
        }
    }

    console.log('[WANS] Final payload: ', payload)

    // save the changes
    savingChanges.value = true
    let response = await updateWans(routerSerial, payload)
    console.log('[WANS] Changes saved: ', response)
});

const nextPage = () => {
    // next page not made yet
    router.push(getRoutePath(configStore.nextPage()));
}

onMounted(() => {
    configureWans()
    loaded.value = true
    console.log('[WANS] Wan1 config: ', wan1config.value)
})
</script>

<template>
    <div class="make-column" style="margin-top: 40px;">
        <h1>WANs</h1>
        <div v-if="loaded" class="make-colum">
            <!-- Dropdown to select which wan template to display, once selected, works with index in the wan1config array-->
            <Dropdown :options="wan1options" :modelValue="selectedWan1Name" :onSelect="setWan1Index"/>
            <table>
                <thead>
                    <tr>
                        <th>IP</th>
                        <th>Mask</th>
                        <th>Gateway</th>
                        <th>Primary DNS</th>
                        <th>Secondary DNS</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(config, index) in wan1config">
                        <tr v-if="index === selectedWan1Index && !config.auto">
                            <td><input type="text" v-model="config.ip"/></td>
                            <td><input type="text" v-model="config.mask"/></td>
                            <td><input type="text" v-model="config.gateway"/></td>
                            <td><input type="text" v-model="config.primaryDns"/></td>
                            <td><input type="text" v-model="config.secondaryDns"/></td>
                        </tr>
                        <tr v-if="index === selectedWan1Index && config.auto">
                            <td colspan="5">Auto configuration for this Wan is disabled</td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <p v-if="!validWan1">Please fill in the IP and Gateway for WAN1</p>
            <p v-if="sameWan1IpGateway">IP and Gateway can't be the same</p>
        </div>
        <!-- checkbox to activate wan2 or not-->
        <input type="checkbox" v-model="useWan2">Use WAN2</input>
        <div class="make-colum" v-if="useWan2">
            <!-- Dropdown to select which wan template to display, once selected, works with index in the wan2config array-->
            <Dropdown :options="wan2options" :modelValue="selectedWan2Name" :onSelect="setWan2Index"/>
            <table>
                <thead>
                    <tr>
                        <th>IP</th>
                        <th>Mask</th>
                        <th>Gateway</th>
                        <th>Primary DNS</th>
                        <th>Secondary DNS</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(config, index) in wan2config">
                        <tr v-if="index === selectedWan2Index">
                            <td><input type="text" v-model="config.ip"/></td>
                            <td><input type="text" v-model="config.mask"/></td>
                            <td><input type="text" v-model="config.gateway"/></td>
                            <td><input type="text" v-model="config.primaryDns"/></td>
                            <td><input type="text" v-model="config.secondaryDns"/></td>
                        </tr>
                        <tr v-if="index === selectedWan2Index && config.auto">
                            <td colspan="5">No configuration for this wan type.</td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <p v-if="!validWan2">Please fill in the IP and Gateway for WAN2</p>
            <p v-if="sameWan2IpGateway">IP and Gateway can't be the same</p>
        </div>
        <button @click="validate">Validate</button>
        <p v-if="savingChanges">Saving changes...</p>
        <p v-if="changesSaved">Changes saved</p>
        <div class="make-row">
            <button @click="goBack">Back</button>
            <button @click="nextPage">Next</button>
        </div>
    </div>
</template>

<style scoped>
    .make-column {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .make-row {
        display: flex;
        flex-direction: row;
        align-items: center;
    }
</style>
