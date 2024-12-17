<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useIdsStore } from '@/stores/ids';
import { useDevicesStore } from '@/stores/devices';
import { getRoutePath, getPageLabel } from '@/utils/PageRouter';

import { getOrganizations } from '@/endpoints/organizations/GetOrganizations';
import { getNetworks } from '@/endpoints/networks/GetNetworks';
import { getNetworkDevices } from '@/endpoints/networks/GetNetworkDevices';
import { changeDeviceName } from '@/endpoints/devices/ChangeDeviceName';

import { useBoolStates } from '@/utils/Decorators';

import Dropdown from '@/components/Dropdown.vue';
import { getNetwork } from '@/endpoints/networks/GetNetwork';
import { changeDeviceAddress } from '@/endpoints/devices/ChangeDeviceAddress';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Popover from 'primevue/popover';
import Card from 'primevue/card';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
const __DEBUG__ = import.meta.env.VITE_APP_DEBUG === 'true';

const router = useRouter();

const toast = useToast();

const ids = useIdsStore();
const devices = useDevicesStore();

const devicesList = ref([]);
const address = ref('');

const saveAddressHelpRef = ref()

const toggleSaveAddressHelp = (event) => {
    saveAddressHelpRef.value.toggle(event)
}

const { orgId, networkId } = storeToRefs(ids);

const organizations = ref([]);
const orgsLoaded = ref(false);

const selectedOrgOption = ref(null);
const selectedNetwork = ref(null);

const loaded = ref(false);

const networks = ref([]);
const networkOptions = ref([]);
const loadingNetworks = ref(false);
const networksLoaded = ref(false);
const newNetworkSelected = ref(false);

const devicesNames = ref([]);
const newDevicesNames = ref([]);
const devicesNamesLoaded = ref(false);

const regexToReplaceString = ref('');
const replacementString = ref('');

const changingDeviceName = ref(false);


interface Option {
    name: string;
    value: any;
}

const confirmChanges = async () => {
    console.log('[EDIT NETWORK] Confirming changes')

    newDevicesNames.value = devicesNames.value.map((device: { name: string, serial: string }) => {
        let regex = new RegExp(regexToReplaceString.value, 'g')
        return {
            name: device.name.replace(regex, replacementString.value),
            serial: device.serial
        }
    })

    console.log('[EDIT NETWORK] New devices names:', newDevicesNames.value)

    changingDeviceName.value = true

    // update the devices names
    for (let device of newDevicesNames.value) {
        await changeDeviceName(device.serial, device.name)
    }

    // reset the newDevicesNames array, the regex and the replacement string
    newDevicesNames.value = []
    regexToReplaceString.value = ''
    replacementString.value = ''

    // reload the devices names
    await getDevicesNames()

    changingDeviceName.value = false
}

const highlightMatch = computed(() => {
    if (regexToReplaceString.value === '') {
        return devicesNames.value.map((device: { name: string }) => device.name)
    } else {
        let regex = new RegExp(regexToReplaceString.value, 'g')
        return devicesNames.value.map((device: { name: string }) => device.name.replace(regex, (match) => `<span style="background-color: #fc828c;">${match}</span>`))
    }
});

const highlightReplacement = computed(() => {
    if (regexToReplaceString.value === '' || replacementString.value === '') {
        return devicesNames.value.map((device: { name: string }) => device.name)
    } else {
        let regex = new RegExp(regexToReplaceString.value, 'g')
        return devicesNames.value.map((device: { name: string }) => device.name.replace(regex, (match) => `<span style="background-color: #7dff9b;">${replacementString.value}</span>`))
    }
});

const getDevicesNames = async () => {
    devicesNamesLoaded.value = false
    let fetchedDevices = await getNetworkDevices(networkId.value)
    devicesNames.value = fetchedDevices.map((device: { name: string; serial: string }) => {
        return {
            name: device.name,
            serial: device.serial
        }
    })
    devicesNamesLoaded.value = true

    devices.setDevicesList(fetchedDevices)
    devicesList.value = fetchedDevices
}

// Populate network options array
const populateNetworkOptions = () => {
    // map networks to options
    networkOptions.value = networks.value.map(network => {
        return {
            value: network.value,
            name: network.name
        }
    })

    console.log('[SETUP] Network options loaded:', networkOptions.value)
}

const savingAddresses = ref(false)

const changeAddress = async () => {
    savingAddresses.value = true
    // change every device address to the new address
    for (const device of devicesList.value) {
        await changeDeviceAddress(device.serial, address.value);
        //console.log('[NAMING] changeAddress response: ', resp);
    }
    savingAddresses.value = false
    toast.add({ severity: 'success', summary: 'Address saved', detail: 'Address saved successfully', life: 3000 }); 
}

const setup = async () => {
    console.log('[SETUP] Setting up edit network page')

    // setup network info
    const fetchedNetwork = await getNetwork(networkId.value)

    selectedNetwork.value = {
        value: fetchedNetwork.id,
        name: fetchedNetwork.name
    }

    // get the devices for the network in store
    await getDevicesNames()

    loaded.value = true
}

onMounted(() => {
    setup()
})

</script>

<template>
    <div class="container" style="margin-bottom: 60px;">
        <Toast position="top-right" />
        <Button @click="router.push('/setup')" class="backbtn">Back</Button>
        <div class="row">
            <div class="col-12">
                <h1>Edit Network</h1>
            </div>
        </div>
        <div v-if="loaded" class="row">
            <div class="col">
                <p>Selected network: {{ selectedNetwork.name }}</p>
                <div class="row">
                    <div class="row marg">
                        <span class="marg">Text to replace:</span>
                        <InputText class="bigger-input" v-model="regexToReplaceString" type="text"/>
                    </div>
                    <div class="row">
                        <span class="marg">Replacement :</span>
                        <InputText class="bigger-input" v-model="replacementString" type="text"/>
                    </div>
                </div>
                <hr />
                <div v-if="devicesNamesLoaded" class="col">
                    <div class="row center">
                        <div class="col center" style="margin-right: 10px; width: 250px;">
                            <h2>Devices names</h2>
                            <ul>
                                <Card v-for="(device, index) in highlightMatch" :key="index" v-html="device" class="bigger-card"></Card>
                            </ul>
                        </div>
                        <i class="pi pi-arrow-right" style="margin-right: 10px;"></i>
                        <div class="col center" style="width: 250px">
                            <h2>New devices names</h2>
                            <ul>
                                <Card v-for="(device, index) in highlightReplacement" :key="index" v-html="device" class="bigger-card"></Card>
                            </ul>
                        </div>
                    </div>
                    <div class="col">
                        <div class="col-12" style="margin-top: 30px;">
                            <Button @click="confirmChanges" :disabled="changingDeviceName" class="constant-width-150 constant-height-40">
                                <v-progress-circular v-if="changingDeviceName" indeterminate color="white" width="3"></v-progress-circular>
                                <span v-else>Rename</span>
                            </Button>
                        </div>
                    </div>
                    <div class="col center" style="margin-top: 40px; margin-bottom: 10px">
                        <div class="col" style="width: 230px;">
                            <span class="pi pi-question-circle" @click="toggleSaveAddressHelp" style="align-self: flex-end; transform: translateY(20px); cursor: pointer;"></span>
                            <h2 style="align-self: center;">Change address</h2>
                        </div>
                        <InputText v-model="address" placeholder="Enter an address" style="margin-bottom: 20px; width: 350px;"/>
                        <Button @click="changeAddress" class="constant-width-150 constant-height-40" :disabled="savingAddresses">
                            <v-progress-circular v-if="savingAddresses" indeterminate color="white" width="3"></v-progress-circular>
                            <span v-else>Save address</span>
                        </Button>

                        <Popover ref="saveAddressHelpRef" style="box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);" appendTo="body">
                            <p>Use this field in case you made a mistake setting the network address in the setup.<br>
                                This field is only saved when using the dedicated button.</p>   
                        </Popover>
                    </div>
                </div>
                <div v-else class="row center" style="margin-top: 30px">
                    <v-progress-circular indeterminate></v-progress-circular>
                </div>
            </div>
        </div>
        <div v-if="!loaded" class="row">
            <v-progress-circular indeterminate></v-progress-circular>
        </div>
    </div>
</template>

<style scoped>
.container {
    margin-top: 20px;
}

.row {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
}

.col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.col-r {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.marg {
    margin: 10px;
}

.margin-sides-big {
    margin: 0 30px;
}

.bigger-input {
    width: 300px;
    height: 30px;
}

.highlightred {
    background-color: #fc828c;
    color: white;
}

.highlightgreen {
  background-color: #7dff9b;
  padding: 2px 4px;
  border-radius: 4px;
}

.inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lists {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.list {
  flex: 1;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin-bottom: 10px;
}

.backbtn {
    margin-bottom: 20px;
    left: 20px;
    top: 20px;
    position: fixed;
}

.bigger-card {
    min-height: 40px;
    min-width: 150px;
    margin: 20px;
    padding: 10px;
    border-radius: 6px;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}

</style>
