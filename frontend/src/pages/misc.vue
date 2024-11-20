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

import Button from 'primevue/button'
import Autocomplete from 'primevue/autocomplete'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'

import { disableWan, enableWan } from '@/endpoints/devices/EnableWan'
import { getManagementInterface } from '@/endpoints/devices/GetManagementInterface'

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
const mxSerial = ref('')
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
    mxSerial.value = device.serial
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

const wan2infoFetched = ref(false)
const wan2enabled = ref(false)

const fetchWan2Info = async() => {
    const resp = await getManagementInterface(mxSerial.value)
    console.log('resp', resp)
    wan2infoFetched.value = true
    wan2enabled.value = resp.wan2.wanEnabled === 'enabled'
}

const toggleWan = async() => {
    if (wan2enabled.value) {
        await disableWan(mxSerial.value, 2)
    } else {
        await enableWan(mxSerial.value, 2)
    }
    await fetchWan2Info()
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
    await fetchWan2Info()
    await populateMxHostname()
    loaded.value = true
}

onMounted(() => {
    setup()
})
</script>

<template>
    <div style="margin-top: 40px;"></div>
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
                    <h4>Currently selected SSID : SSID {{ splashPage.ssidNumber }}</h4>
                    <p style="margin-top: 10px;">Current splash URL: {{ splashPage.splashUrl }}</p>
                    <div class="row center" style="margin-top: 10px;">
                        <p style="margin-right: 15px;">New URL to use:</p>
                        <InputText v-model="splashPage.splashUrl" placeholder="Enter URL"/>
                    </div>
                </div>
            </div>
        </div>
        <Button @click="validateSplash">Save</Button>
        <p v-if="savingChanges">Saving changes...</p>
        <p v-if="changesSaved">Changes saved</p>
    </div>
    <div v-if="mxPresent" style="margin-top: 30px;">
        <h3>MX Notes</h3>
        <div v-if="!loaded">
            <p>Loading...</p>
        </div>
        <div v-if="loaded">
            <v-textarea class="notes-area" v-model="mxNotes" variant="outlined" auto-grow placeholder="Enter notes"/>
            <Button @click="updateMXNotes">Save</Button>
        </div>
    </div>
    <div style="margin-top: 30px;" v-if="wan2infoFetched">
        <!-- Ask to enable wan2 or not-->
        <h3>WAN2</h3>
        <div v-if="!wan2enabled">
            <Tag severity="danger" class="tag-style">Disabled</Tag>
            <Button @click="toggleWan" class="smaller">Enable</Button>
        </div>
        <div v-if="wan2enabled">
            <Tag severity="success" class="tag-style">Enabled</Tag>
            <Button @click="toggleWan" class="smaller">Disable</Button>
        </div>
    </div>
    <div v-if="mxPresent && mxHostnameLoaded && config.useHostname" style="margin-top: 30px;">
        <h3>Mx Hostname</h3>
        <div>
            <p>Current MX hostname prefix: {{ mxHostname }}</p>
            <p>New MX hostname prefix suggested:</p>
            <InputText v-model="newMxHostname" placeholder="Enter MX hostname"/><span>-suffix</span>
            <Button @click="updateMxHostname">Save</Button>
        </div>
    </div>
    <div style="margin-top: 20px;" class="row center">
        <Button style="margin-right: 15px;" @click="prevPage">Previous</Button>
        <Button @click="nextPage">Next</Button>
    </div>
</template>

<style scoped>
.notes-area {
    width: 100%;
    min-width: 300px;
}

.smaller {
    padding-top: 4px;
    padding-bottom: 4px;
    width: 80px;
}

.tag-style {
    margin-right: 15px;
    font-size:medium;
    font-weight:600;
    width: 80px;
}
</style>