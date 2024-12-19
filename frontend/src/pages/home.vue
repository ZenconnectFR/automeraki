<template>
    <Button icon="pi pi-user" @click="moreOptions = true" label="" class="vpn-btn"/>
    <h1>Welcome to Automeraki</h1>

    <Divider style="width: 250px;"></Divider>

    <Button @click="goToConfig" label="Configure network" />
    <div v-if="progress.isProgressSaved()" class="col center" style="margin-top: 20px;">
        <Button @click="continueLastConf" label="Continue last configuration" style="margin-bottom: 10px;"/>
        <Tag style="margin-top: 10px;" severity="secondary">
            {{ lastEditedNetwork }}
        </Tag>
    </div>

    <Drawer v-model:visible="moreOptions" header="Your information" position="right" style="width: 400px;">
        <div class="col center">

            <Tag style="margin-top: 25px;" severity="secondary">
                {{ userEmail }}
            </Tag>

            <Button @click="sessionStore.clearSession(); router.push('/')" label="Logout" style="margin-top: 25px;"/>
        </div>
    </Drawer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'
import { useIdsStore } from '@/stores/ids'
import { useConfigurationStore } from '@/stores/configuration'
import { useDevicesStore } from '@/stores/devices'
import { useNextStatesStore } from '@/stores/nextStates'
import { useProgressStore } from '@/stores/progress'

import { getTemplateData } from '@/endpoints/templates/GetTemplateData'
import { getNetwork } from '@/endpoints/networks/GetNetwork'

import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import { getRoutePath } from '@/utils/PageRouter'

const router = useRouter()
const sessionStore = useSessionStore()
const progress = useProgressStore()
const ids = useIdsStore()
const devices = useDevicesStore()
const nextStates = useNextStatesStore()
const configStore = useConfigurationStore()

const moreOptions = ref(false)

const userEmail = ref('')

const lastEditedNetwork = ref('')

const parseJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))

        return JSON.parse(jsonPayload)
    } catch (e) {
        return {}
    }
}

const goToConfig = () => {
    router.push('/setup')
}

const continueLastConf = async () => {
    // Allows to continue the last configuration using the data in the progress store

    // 1: get the data
    const devicesList = progress.getDevicesListSave()
    const lastStep = progress.getStepSave()
    const orgId = progress.getOrgIdSave()
    const networkId = progress.getNetworkIdSave()
    const templatePath = progress.getTemplatePathSave()
    const unlockedStates = progress.getUnlockedStates()

    // 2: set data in stores for those that can immediately be used
    ids.setOrgId(orgId)
    ids.setNewNetworkId(networkId)
    devices.setDevicesList(devicesList)
    nextStates.setNextStates(unlockedStates)

    // 3: get missing data (configuration (aka template) and current step path (aka template step at index lastStep))
    let templateData = await getTemplateData(orgId, templatePath)

    // 4: set the configuration in the store
    configStore.setConfiguration(templateData)
    configStore.setCurrentPageIndex(lastStep)
    configStore.setCurrentPageConfig(templateData.actions[lastStep].data)

    // 5: go to the last step
    let lastStepPath = getRoutePath(templateData.actions[lastStep].type)

    // debug: 
    console.log('lastStepPath', lastStepPath)
    console.log('templateData', templateData)
    console.log('DevicesList', devicesList)
    console.log('lastStep', lastStep)
    console.log('orgId and networkId', orgId, ' - ', networkId)
    console.log('templatePath', templatePath)
    console.log('unlockedStates', unlockedStates)
    router.push(lastStepPath)
}

onMounted(() => {
    if (sessionStore.getIdToken()) {
        const token = parseJwt(sessionStore.getSession())
        userEmail.value = token.sub
    }

    if (progress.isProgressSaved()) {
        console.log('progress is saved')
        let lastNetworkid = progress.getNetworkIdSave()
        getNetwork(lastNetworkid).then((network) => {
            lastEditedNetwork.value = network.name
        })
    }
})

</script>