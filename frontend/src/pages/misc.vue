<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'

import { storeToRefs } from 'pinia'

import { getSplashPage } from '@/endpoints/networks/GetSplashPage'
import { updateSplashPage } from '@/endpoints/networks/UpdateSplashPage'

import { useBoolStates } from '@/utils/Decorators'
import { getRoutePath } from '@/utils/PageRouter'

import { useRouter, useRoute } from 'vue-router'

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
            splashPages.value.push(splashPage)
        }
        splashPage['useExpectedUrl'] = false
    }
}

const validate = useBoolStates([savingChanges], [changesSaved], async() => {
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

const prevPage = () => {
    router.push(getRoutePath(configStore.prevPage()))
}

const nextPage = () => {
    router.push(getRoutePath(configStore.nextPage()))
}

const setup = async() => {
    await populateSplashPages()
    initSplashPagesSection()
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
            <div v-for="splashPage in splashPages" :key="splashPage">
                <div>
                    <p>{{ splashPage.ssidNumber }}</p>
                    <p>Current url entered : {{ splashPage.splashUrl }}</p>
                    <input v-model="splashPage.expectedUrl" />
                    <label for="useExpectedUrl">Use expected url</label>
                    <input type="checkbox" id="useExpectedUrl" v-model="splashPage.useExpectedUrl" />
                </div>
            </div>
        </div>
        <button @click="validate">Save</button>
        <p v-if="savingChanges">Saving changes...</p>
        <p v-if="changesSaved">Changes saved</p>
        <button @click="prevPage">Back</button>
        <button @click="nextPage">Next</button>
    </div>
</template>