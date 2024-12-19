<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { useNextStatesStore } from '@/stores/nextStates'
import { useProgressStore } from '@/stores/progress'
import { storeToRefs } from 'pinia'

import { getPorts } from '@/endpoints/devices/GetPorts'
import { configurePortsBatch } from '@/endpoints/actionBatches/ConfigurePorts'
import { updateMTUSize } from '@/endpoints/devices/switch/UpdateMTUSize'
import { updateSTPSettings } from '@/endpoints/devices/switch/UpdateSTPSettings'
import { getVlans } from '@/endpoints/networks/GetVlans'

import { useBoolStates } from '@/utils/Decorators'
import { getRoutePath } from '@/utils/PageRouter'
import { parseListError } from '@/utils/Misc'

import { useRouter, useRoute } from 'vue-router'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import MultiSelect from 'primevue/multiselect'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Tag from 'primevue/tag'

const toast = useToast()

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()
const nextStates = useNextStatesStore()
const progress = useProgressStore()

const { currentPageConfig, currentPageIndex } = storeToRefs(configStore)
let config = currentPageConfig.value
let thisState = nextStates.getState(currentPageIndex.value)

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList } = storeToRefs(devices)

const typeOptions = ['access', 'trunk']

const portsAutoConfigured = ref([] as any[])
const portsAutoConfigDone = ref(false)

const savingChanges = ref(false)
const changesSaved = ref(false)

// define any[] type for switches
const switches = ref([] as any[])

const vlans = ref([] as { id: string; name: string }[])
const vlanOptions = ref([] as any[])

const stpPayload = ref([] as any[])

const stpRef = ref(<HTMLElement | null>(null))
const topRef = ref(<HTMLElement | null>(null))

const editingRows = ref([])

interface Option {
    name: string;
    value: any;
}

const onRowEditSave = (event: any) => {
    console.log('Row edit save')
    const { index, newData } = event
    stpPayload.value[index] = newData

    // if the elements in newData.switches exist in other elements of stpPayload, remove them
    for (let i = 0; i < stpPayload.value.length; i++) {
        if (i !== index) {
            const otherSwitches = stpPayload.value[i].switches

            const otherSwitchesFiltered = otherSwitches.filter((otherSwitch: any) => {
                return !newData.switches.includes(otherSwitch)
            })

            stpPayload.value[i].switches = otherSwitchesFiltered
        }
    }
}


// filter out the extra ports on some switches
// Ex: MS120 models return the extra 2 or 4 ports on the side of the switch when calling the getPorts endpoint, we don't want those
const filterPorts = (model: string, ports: any[]) => {
    if (model.includes('MS120-8')) {
        return ports.filter((port: { portId: string }) => parseInt(port.portId) <= 8)
    } else if (model.includes('MS120-24')) {
        return ports.filter((port: { portId: string }) => parseInt(port.portId) <= 24)
    } else if (model.includes('MS120-48')) {
        return ports.filter((port: { portId: string }) => parseInt(port.portId) <= 48)
    } else {
        return ports
    }
}

const configurePorts = async () => {
    // load switches
    switches.value = devicesList.value.filter((device: { type: string }) => device.type === 'switch')

    console.log('Switches: ', switches.value)

    /**
     * - for each switch, get the ports (api call)
     * - for each port, check if its id is in the config file at config.value.ports[n].config.ports[n].id
     * - if it is, add the port from the config file to the portsAutoConfigured array
     * - if it is not, add the port to the portsAutoConfigured array with the config from config.value.ports[n].config.default
     * - if the port is not in the config file, add it to the portsAutoConfigured array with the config from config.value.ports[n].config.default
     */

    for (const switchDevice of switches.value) {
        // get the ports for the switch
        let ports = await getPorts(switchDevice.serial)

        // filter out the extra ports on some switches
        ports = filterPorts(switchDevice.model, ports)


        // get the port config for the switch
        let switchConfig = null
        for (const configSwitch of config.ports) {
            if (configSwitch.switchName === switchDevice.associationId) {
                // check if same number of ports
                console.log("ports.length : ", ports.length, " configSwitch.nbPorts : ", configSwitch.nbPorts)
                if (ports.length === configSwitch.nbPorts) {
                    switchConfig = configSwitch.config
                    break
                }
            }
        }

        if (switchConfig === null) {
            console.error(`No config found for switch ${switchDevice.shortName}`)
            continue
        }

        console.log(ports)

        let portsAutoConfiguredSwitch = []

        // for each port, check if it is in the config file
        for (const port of ports) {
            let portConfig = null
            for (const configPort of switchConfig.ports) {
                if (configPort.id == port.portId) {
                    portConfig = configPort
                    break
                }
            }

            // if the port is not in the config file, use the default config
            if (portConfig === null) {
                portConfig = switchConfig.default
            }

            // check if the vlan exists in the store
            let vlanExists = false
            // console.log("vlans : ", vlans.value)
            for (const vlan of vlans.value) {
                // console.log("vlan : ", vlan)
                if (vlan['id'] == portConfig.vlan) {
                    vlanExists = true
                    break
                }
            }

            if (!vlanExists) {
                console.error(`Vlan ${portConfig.vlan} does not exist in the store`)
                continue
            }

            // add the port to the
            portsAutoConfiguredSwitch.push({
                id: port.portId,
                name: portConfig.name,
                vlan: portConfig.vlan,
                type: portConfig.type,
                voiceVlan: portConfig.voiceVlan? portConfig.voiceVlan : null
            })

            //console.log("pushed port with config : ", portsAutoConfiguredSwitch)
        }

        portsAutoConfigured.value.push({
            serial: switchDevice.serial,
            name: switchDevice.associationId,
            ports: portsAutoConfiguredSwitch
        })

        console.log("pushed switch with ports : ", portsAutoConfigured.value)
    }

    // set switch stp
    // map the configuration.value.stp to the switch serials : configuration.value.stp[n].expectedEquipment === devicesList[n].shortName

    for (const stpConfig of config.stp) {
        let switchesStp = []

        // special case: expected equipment names are in an array in stpConfig.switches (ex: ['S1', 'S2'])
        for (const expectedEquipment of stpConfig.switches) {
            for (const device of devicesList.value) {
                if (device.associationId === expectedEquipment) {
                    switchesStp.push(device.serial)
                }
            }
        }

        stpPayload.value.push({
            stpPriority: stpConfig.stpPriority,
            switches: switchesStp
        })
    }

    console.log("portsAutoConfigured : ", portsAutoConfigured.value)

    // sort the portsAutoConfigured array by associationId
    portsAutoConfigured.value.sort((a, b) => a.name.localeCompare(b.name))

    portsAutoConfigDone.value = true
}

const confirm = useBoolStates([savingChanges],[changesSaved],async () => {

    // for all ports, if any have a vlan that is not a string, transform it to a string with the id
    portsAutoConfigured.value.forEach((switchPorts: { ports: any[] }) => {
        switchPorts.ports.forEach((port: { vlan: any }) => {
            if (typeof port.vlan !== 'string') {
                port.vlan = port.vlan.value
            }
        })
    })

    console.log('Confirming ports configuration : ', portsAutoConfigured.value)

    // for testing purpose: triple portsAutoConfigured to simulate a large number of ports
    // portsAutoConfigured.value = portsAutoConfigured.value.concat(portsAutoConfigured.value).concat(portsAutoConfigured.value)

    // send the portsAutoConfigured to the Endpoint that creates action batches
    let response = await configurePortsBatch(portsAutoConfigured.value, orgId.value) as any

    console.log('Action batch response : ', response)

    // if the response is not a success, show an error toast
    if (response.status.failed) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Error while saving configuration on Meraki:\n${parseListError(response.status.errors)}`})
        return
    }

    // also change switch mtu size
    const mtnRes = await updateMTUSize(newNetworkId.value, config.mtuSize)
    console.log('MTU size updated : ', mtnRes)

    // also change stp settings
    /*
    let stpPayloadReal = stpPayload.value.map((stpConfig: { stpPriority: number, switches: any[] }) => {
        return {
            stpPriority: stpConfig.stpPriority,
            switches: stpConfig.switches.map((switchDe: { serial: string }) => switchDe.serial)
        }
    })
    */

    console.log('Setting STP : ', stpPayload.value)
    try {
        const stpRes = await updateSTPSettings(newNetworkId.value, stpPayload.value)
        console.log('STP settings updated : ', stpRes)
    } catch (error) {
        console.error('Error while updating STP settings : ', error)
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error while updating STP settings on Meraki'})
        return
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Configuration saved on Meraki', life: 5000 })

    thisState = true;
    nextStates.setStateTrue(currentPageIndex.value)
});

const moveSwitch = (switches: any[], index: number) => {
    const selectedSwitches = stpPayload.value[index].switches

    for (let i = 0; i < stpPayload.value.length; i++) {
        if (i !== index) {
            const otherSwitches = stpPayload.value[i].switches

            const otherSwitchesFiltered = otherSwitches.filter((otherSwitch: any) => {
                return !selectedSwitches.includes(otherSwitch)
            })

            stpPayload.value[i].switches = otherSwitchesFiltered
        }
    }
}

const back = () => {
    router.push(getRoutePath(configStore.prevPage()))
}

const nextPage = () => {
    progress.save(devices.getDevicesList(), currentPageIndex.value + 1, nextStates.getStates())
    router.push(getRoutePath(configStore.nextPage()))
}

const fetchVlans = async () => {
    await getVlans(newNetworkId.value).then((response) => {
        vlans.value = response
    })
    vlanOptions.value = vlans.value.map((vlan) => {
        return {
            value: `${vlan.id}`,
            name: `${vlan.id} - ${vlan.name}`
        }
    })
}

const setup = async () => {
    await fetchVlans()
    console.log('Vlan Options : ', vlanOptions.value)
    await configurePorts()
}

onMounted(() => {
    setup()
})

</script>

<template>
    <section ref="topRef"></section>
    <Toast position="top-right" />
    <div style="margin-top: 40px;">
        <h1>Ports</h1>
    </div>
    <template v-if="portsAutoConfigDone">
        <h2>Auto-configured ports</h2>
        <!-- show the content of the portsAutoConfigured. Will be paginated by switch. Name can be edited.
         vlan is shown in a dropdown with the options being the values in vlans from the device store
         type is also a dropdown and the options are either access or trunk
         The whole thing is in a table so that everything is separated right-->
            <Button class="constant-width-150 constant-height-40" @click="confirm" :disabled="savingChanges">
                <v-progress-circular v-if="savingChanges" indeterminate width="3" color="white"></v-progress-circular>
                <span v-else>Save on Meraki</span>
            </Button>
            <div class="row center" style="margin-top: 20px;">
                <Button style="margin-right: 15px;" @click="back">Back</Button>
                <Button :disabled="!thisState" @click="nextPage">Next</Button>
            </div>
        <template v-for="switchPorts in portsAutoConfigured">
            <h3 style="margin-top: 40px;">{{ switchPorts.name }}</h3>
            <DataTable :value="switchPorts.ports" style="width: 1000px;">
                <Column field="id" header="Port ID"></Column>
                <Column field="name" header="Port Name" style="width: 30%"></Column>
                <Column field="vlan" header="VLAN"></Column>
                <Column field="type" header="Type"></Column>
                <Column field="voiceVlan" header="Voice VLAN" style="width: 15%;"></Column>
            </DataTable>
        </template>
        <section class="stp-section" ref="stpRef" style="margin-top: 30px;">
            <h2>STP Configuration</h2>
            <!-- div v-for="(stpConfig, index) in stpPayload">
                <h3>STP Priority</h3>
                <InputText class="add-margin" type="number" v-model="stpConfig.stpPriority"/>
                <h3>Switches</h3>

                <MultiSelect class="add-margin" v-model="stpConfig.switches" :options="switches" optionLabel="associationId" optionValue="serial"
                    @onChange="moveSwitch(switches, index)" dataKey="serial" display="chip" style="min-width: 250px;"/> 

                <Button class="add-margin" @click="stpPayload.splice(index, 1)">Remove</Button>
            </div -->
            <DataTable :value="stpPayload" style="width: 1000px;" editMode="row"
                @row-edit-save="onRowEditSave"
                v-model:editingRows="editingRows" dataKey="stpPriority"
                :pt="{
                        table: { style: 'min-width: 50rem' },
                    }"
                >
                <Column field="stpPriority" header="STP Priority">
                    <template #body="{ data }">
                        <span>{{ data.stpPriority }}</span>
                    </template>
                    <template #editor="{ data }">
                        <InputText type="number" v-model="data.stpPriority"/>
                    </template>
                </Column>
                <Column field="switches" header="Switches" style="width: 50%">
                    <template #body="{ data }">
                        <div style="display: flex; flex-wrap: wrap; flex-direction: row;">
                            <div v-for="switchSerial in data.switches">
                                <Tag severity="secondary" style="margin: 5px;">
                                    {{ switches.find(switchDev => switchDev.serial === switchSerial).associationId }}
                                </Tag>
                            </div>
                        </div>
                    </template>
                    <template #editor="{ data }">
                        <MultiSelect v-model="data.switches" :options="switches" optionLabel="associationId" optionValue="serial"
                            @onChange="moveSwitch(switches, data)" dataKey="serial" display="chip" style="min-width: 250px;"/>
                    </template>
                </Column>
                <Column :row-editor="true" style="width: 12%"></Column>
                <Column style="width: 10%">
                    <template #body="{ data }">
                        <Button @click="stpPayload.splice(stpPayload.indexOf(data), 1)">Remove</Button>
                    </template>
                </Column>
            </DataTable>
            <Button class="add-margin" @click="stpPayload.push({ stpPriority: stpPayload[stpPayload.length - 1]?.stpPriority + 1 | 0, switches: [] })">Add STP rule</Button>
        </section>
        <section style="margin-bottom: 60px;">
            <h2>MTU Size</h2>
            <InputText class="add-margin" type="number" v-model="config.mtuSize"/>
        </section>
    </template>
    <v-progress-circular v-else indeterminate width="3" color="primary"></v-progress-circular>
</template>

<style scoped>
    .space-row-col {
        margin: 20px;
    }

    .add-margin {
        margin: 20px;
    }

    table {
        width: 25%;
    }
</style>
