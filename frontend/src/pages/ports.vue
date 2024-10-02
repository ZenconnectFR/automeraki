<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { getPorts } from '@/endpoints/devices/GetPorts'
import { configurePortsBatch } from '@/endpoints/actionBatches/ConfigurePorts'
import { getActionBatchStatus } from '@/endpoints/actionBatches/GetActionBatch'
import { updateMTUSize } from '@/endpoints/devices/switch/UpdateMTUSize'

import Dropdown from '@/components/Dropdown.vue'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { configuration } = storeToRefs(configStore)

const { newNetworkId, orgId } = storeToRefs(ids)
const { devicesList, vlans } = storeToRefs(devices)

const typeOptions = ['access', 'trunk']

const portsAutoConfigured = ref([] as any[])
const portsAutoConfigDone = ref(false)

const savingChanges = ref(false)
const changesSaved = ref(false)

// define any[] type for switches
const switches = ref([])

const configurePorts = async () => {
    // load switches
    switches.value = devicesList.value.filter((device: { type?: string }) => device.type === 'S')

    /**
     * for each switch, configure the ports according to the config file
     * final structure must be of the form:
     * [
     *   {
     *     serial: string,
     *     name: string,
     *     ports: [
     *       {
     *          id: int,
     *          name: string,
     *          vlan: int,
     *          type: string
     *       }
     *     ]
     *   }
     * ]
     *
     * Logic:
     * - for each switch, get the ports (api call)
     * - for each port, check if its id is in the config file at config.value.ports[n].config.ports[n].id
     * - if it is, add the port from the config file to the portsAutoConfigured array
     * - if it is not, add the port to the portsAutoConfigured array with the config from config.value.ports[n].config.default
     * - if the port is not in the config file, add it to the portsAutoConfigured array with the config from config.value.ports[n].config.default
     */

    for (const switchDevice of switches.value) {
        // get the port config for the switch
        let switchConfig = null
        for (const configSwitch of configuration.value.ports) {
            console.log("configSwitch : ", configSwitch)
            console.log("switchDevice : ", switchDevice)
            if (configSwitch.switchName === switchDevice.shortName) {
                switchConfig = configSwitch.config
                break
            }
        }

        if (switchConfig === null) {
            console.error(`No config found for switch ${switchDevice.shortName}`)
            continue
        }

        // get the ports
        let ports = await getPorts(switchDevice.serial)

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
            for (const vlan of vlans.value) {
                // console.log("comparing vlan : ", vlan, " with portConfig.vlan : ", portConfig.vlan)
                if (vlan == portConfig.vlan) {
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
                type: portConfig.type
            })

            //console.log("pushed port with config : ", portsAutoConfiguredSwitch)
        }

        portsAutoConfigured.value.push({
            serial: switchDevice.serial,
            name: switchDevice.shortName,
            ports: portsAutoConfiguredSwitch
        })

        console.log("pushed switch with ports : ", portsAutoConfigured.value)
    }

    console.log("portsAutoConfigured : ", portsAutoConfigured.value)
    portsAutoConfigDone.value = true
}

const confirm = async () => {
    console.log('Confirming ports configuration : ', portsAutoConfigured.value)
    savingChanges.value = true
    changesSaved.value = false
    // send the portsAutoConfigured to the Endpoint that creates action batches
    let response = await configurePortsBatch(portsAutoConfigured.value, orgId.value)
    // wait until the action batches is done (check if reponse.status.completed is true), if not, wait 500ms and get the status again through the getActionBatchStatus endpoint
    console.log('Action batch response : ', response)
    if (response.status.completed) {
        console.log('Action batch completed')
    } else {
        console.log('Action batch not completed')
        while (true) {
            await new Promise(r => setTimeout(r, 500))
            let newResponse = await getActionBatchStatus(response.id, orgId.value)
            console.log('Action batch status : ', newResponse)
            if (newResponse.status.completed) {
                console.log('Action batch completed')
                break
            }
        }
    }

    // also change switch mtu size
    const mtnRes = await updateMTUSize(newNetworkId.value, configuration.value.mtuSize)
    console.log('MTU size updated : ', mtnRes)

    changesSaved.value = true
    savingChanges.value = false
}

const back = () => {
    router.push('/vlan')
}

onMounted(() => {
    configurePorts()
})

</script>

<template>
    <div>
        <h1>Ports</h1>
    </div>
    <template v-if="portsAutoConfigDone">
        <h2>Auto-configured ports</h2>
        <!-- show the content of the portsAutoConfigured. Will be paginated by switch. Name can be edited.
         vlan is shown in a dropdown with the options being the values in vlans from the device store
         type is also a dropdown and the options are either access or trunk
         The whole thing is in a table so that everything is separated right-->
        <button @click="confirm">Confirm</button>
        <p v-if="savingChanges">Saving changes...</p>
        <p v-if="changesSaved">Ports auto-configured</p>
        <button @click="back">Back</button>
        <template v-for="switchPorts in portsAutoConfigured">
            <h3>{{ switchPorts.name }}</h3>
            <table class="space-row-col">
                <thead>
                    <tr>
                        <th>Port</th>
                        <th>Name</th>
                        <th>VLAN</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="port in switchPorts.ports">
                        <tr>
                            <td>{{ port.id }}</td>
                            <td><input type="text" v-model="port.name"></td>
                            <td>
                                <Dropdown class="add-margin" :options="vlans"
                                    :modelValue="port.vlan"
                                    :onSelect="(option) => port.vlan = option"/> <!-- vlans is a string[], port.vlan is a string-->
                            </td>
                            <td>
                                <Dropdown class="add-margin" :options="typeOptions"
                                    :modelValue="port.type"
                                    :onSelect="(option) => port.type = option" /><!-- port.type is a string-->
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </template>
    </template>
</template>

<style scoped>
    .space-row-col {
        margin: 20px;
    }

    .add-margin {
        margin: 20px;
    }
</style>
