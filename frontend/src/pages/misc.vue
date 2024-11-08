<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'

import { storeToRefs } from 'pinia'

import { getSplashPage } from '@/endpoints/networks/GetSplashPage'
import { updateSplashPage } from '@/endpoints/networks/UpdateSplashPage'
import { getDevice } from '@/endpoints/devices/GetDevice'
import { updateNotes } from '@/endpoints/devices/UpdateNotes'
import { getMxSettings } from '@/endpoints/networks/GetMxSettings'
import { updateMxSettings } from '@/endpoints/networks/UpdateMxSettings'
import { getNetwork } from '@/endpoints/networks/GetNetwork'

import { useBoolStates } from '@/utils/Decorators'
import { getRoutePath } from '@/utils/PageRouter'

import { useRouter, useRoute } from 'vue-router'
import Dropdown from '@/components/Dropdown.vue'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const loaded = ref(false)
const savingChanges = ref(false)
const changesSaved = ref(false)

// 1 - Splash page(s)
const splashPagesSettings = ref([] as any[])

const splashPagesOptions = ref([] as {title: string, value: string}[])
const selectedSplashPage = ref('0')

const populateSplashPages = async() => {
    const response = await getSplashPage(newNetworkId.value)
    console.log('response', response)
    splashPagesSettings.value = response
}

const splashPages = ref([] as any[])

const initSplashPagesSection = () => {
    console.log('config: ', config)
    // for each splash page in the fetched data, find the corresponding splash page in the config (using number).
    // if found, add the field 'expectedUrl' to the splash page object
    for (const splashPage of splashPagesSettings.value) {
        console.log('splashPage: ', splashPage)
        console.log('config.splashPages: ', config.splashPages)
        const found = config.splashPages.find((sp: any) => sp.number === splashPage.ssidNumber)
        if (found) {
            console.log('found: ', found)
            splashPage['expectedUrl'] = found.url
        } else {
            splashPage['expectedUrl'] = ''
        }
        splashPage['useExpectedUrl'] = false
        splashPages.value.push(splashPage)
    }

    // populate options for the dropdown
    for (const splashPage of splashPages.value) {
        splashPagesOptions.value.push({
            title: `SSID ${splashPage.ssidNumber}`,
            value: splashPage.ssidNumber
        })
    }
}

// 2 - MX Notes

const mxNotes = ref('')
const mxPresent = ref(false)

const populateMXNotes = async() => {
    if (!devicesList.value) {
        return
    }
    const device = devicesList.value.find((device: any) => device.type === 'router')
    console.log('device', device)
    if (!device) {
        return
    }
    mxPresent.value = true
    const resp = await getDevice(device.serial)
    mxNotes.value = resp['notes']?resp['notes']:''
    console.log('mxNotes [', mxNotes.value ,']')
}

const updateMXNotes = async() => {
    const device = devicesList.value.find((device: any) => device.type === 'router')
    const resp = await updateNotes(device.serial, mxNotes.value)
    console.log('resp', resp)
}

const validateSplash = useBoolStates([savingChanges], [changesSaved], async() => {
    for (const splashPage of splashPages.value) {
        if (splashPage.useExpectedUrl) {
            splashPage.splashUrl = splashPage.expectedUrl
            splashPage.useSplashUrl = true
        }

        const payload = {
            ssidNumber: splashPage.ssidNumber,
            splashUrl: splashPage.splashUrl,
            useSplashUrl: splashPage.useSplashUrl
        }

        console.log('payload', payload)

        const resp = await updateSplashPage(newNetworkId.value, payload)
        console.log('resp', resp)
    }
});

// 3 - MX Hostname

const mxHostname = ref('')
const newMxHostname = ref('')
const mxHostnameLoaded = ref(false)

const populateMxHostname = async() => {
    const resp = await getMxSettings(newNetworkId.value)
    console.log('resp', resp)
    mxHostname.value = resp.dynamicDns.prefix
    mxHostnameLoaded.value = true

    // load the new value from config
    newMxHostname.value = config.mxHostname?config.mxHostname:''

    // replace variables in the new value
    newMxHostname.value = newMxHostname.value.replace(/{orgId}/g, orgId.value)
    newMxHostname.value = newMxHostname.value.replace(/{networkId}/g, newNetworkId.value)
    // handle network name variable
    if (newMxHostname.value.includes('{networkName}')) {
        console.log('networkName variable found')
        const network = await getNetwork(newNetworkId.value)
        newMxHostname.value = newMxHostname.value.replace(/{networkName}/g, network.name)
    }

    console.log('newMxHostname', newMxHostname.value)
}

const updateMxHostname = async() => {
    const payload = {
        dynamicDns: {
            prefix: newMxHostname.value
        }
    }
    const resp = await updateMxSettings(newNetworkId.value, payload)
    console.log('resp', resp)
}

const prevPage = () => {
    router.push(getRoutePath(configStore.prevPage()))
}

const nextPage = () => {
    router.push(getRoutePath(configStore.nextPage()))
}

const setup = async() => {
    await populateSplashPages()
    initSplashPagesSection()
    await populateMXNotes()
    await populateMxHostname()
    loaded.value = true
}

onMounted(() => {
    setup()
})
</script>

<template>
    <h2>Misc</h2>
    <div>
        <h3>Splash pages</h3>
        <div v-if="!loaded">
            <p>Loading...</p>
        </div>
        <div v-if="loaded">
            <v-autocomplete :items="splashPagesOptions" v-model="selectedSplashPage" label="Select SSID" variant="outlined"/>
            <div v-for="splashPage in splashPages" :key="splashPage.ssidNumber">
                <div v-if="splashPage.ssidNumber == selectedSplashPage">
                    <h4>SSID {{ splashPage.ssidNumber }}</h4>
                    <p>Current plash URL: {{ splashPage.splashUrl }}</p>
                    <div>
                        <input type="checkbox" v-model="splashPage.useExpectedUrl"/>
                        <label>Use expected URL</label>
                    </div>
                    <input v-model="splashPage.expectedUrl" placeholder="Enter expected URL"/>
                </div>
            </div>
        </div>
        <button @click="validateSplash">Save</button>
        <p v-if="savingChanges">Saving changes...</p>
        <p v-if="changesSaved">Changes saved</p>
    </div>
    <div v-if="mxPresent">
        <h3>MX Notes</h3>
        <div v-if="!loaded">
            <p>Loading...</p>
        </div>
        <div v-if="loaded">
            <v-textarea class="notes-area" v-model="mxNotes" variant="outlined" auto-grow placeholder="Enter notes"/>
            <button @click="updateMXNotes">Save</button>
        </div>
    </div>
    <div v-if="mxPresent && mxHostnameLoaded">
        <h3>Mx Hostname</h3>
        <div>
            <p>Current MX hostname prefix: {{ mxHostname }}</p>
            <p>New MX hostname prefix suggested:</p>
            <input v-model="newMxHostname" placeholder="Enter MX hostname"/><span>-suffix</span>
            <button @click="updateMxHostname">Save</button>
        </div>
    </div>
    <div>
        <button @click="prevPage">Previous</button>
        <button @click="nextPage">Next</button>
    </div>
</template>

<style scoped>
.notes-area {
    width: 100%;
    min-width: 300px;
}
</style>