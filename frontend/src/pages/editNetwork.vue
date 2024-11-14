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

const __DEBUG__ = import.meta.env.VITE_APP_DEBUG === 'true';

const router = useRouter();

const ids = useIdsStore();
const devices = useDevicesStore();

const { orgId, networkId } = storeToRefs(ids);

const organizations = ref([]);
const orgsLoaded = ref(false);

const selectedOrgOption = ref(null);
const selectedNetwork = ref(null);

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

const escapeHtml = (text: string) => {
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
};

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
        return devicesNames.value.map((device: { name: string }) => device.name.replace(regex, `<span class="highlightred">${regexToReplaceString.value}</span>`))
    }
});

const highlightReplacement = computed(() => {
    if (regexToReplaceString.value === '' || replacementString.value === '') {
        return devicesNames.value.map((device: { name: string }) => device.name)
    } else {
        let regex = new RegExp(regexToReplaceString.value, 'g')
        return devicesNames.value.map((device: { name: string }) => device.name.replace(regex, `<span class="highlightgreen">${replacementString.value}</span>`))
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
}


// if selectedOrgOption is modified, set the orgId in the store
const setOrganizationOption = async () => {
    console.log('[SETUP] Selected org option in set org:', selectedOrgOption.value)
    if (orgId.value === selectedOrgOption.value.value) {
        return
    }

    orgId.value = selectedOrgOption.value.value
    ids.setOrgId(selectedOrgOption.value.value)

    useBoolStates([loadingNetworks], [networksLoaded], async () => {
        networks.value = await getNetworks(orgId.value)
        if (networks.value === undefined) {
            networks.value = []
            console.error('[SETUP] No networks found for org:', orgId.value)
        } else {
            console.log('[SETUP] Networks loaded:', networks.value)
            populateNetworkOptions()
        }
    })();
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

// Set the selected network
const setNetworkOption = async(option: Option | { value: string; name: string }) => {
    selectedNetwork.value = option
    networkId.value = option.value
    console.log('[SETUP] Selected network:', selectedNetwork.value)
    newNetworkSelected.value = true
    await getDevicesNames()
}

const setup = async () => {
    let fetchedOrgs = await getOrganizations()
        // turn the fetchedOrgs.id into .value
    organizations.value = fetchedOrgs.map((org: { id: string; name: string }) => {
        return {
            value: org.id,
            name: org.name
        }
    })

    // orgId is set by App.vue if the app is contained in meraki, else it defaults to -1
    /*
    if (orgId.value && orgId.value !== '-1') {
        ids.setOrgId(orgId.value)

        let selectedOrg = organizations.value.find(org => org.value === orgId.value)
        console.log('[SETUP] Selected org at load:', selectedOrg)

        selectedOrgOption.value = { name: selectedOrg.name, value: selectedOrg.value}
        console.log('[SETUP] Selected orgOption at load:', selectedOrgOption.value)

        // get the templates for the selected org
        setOrganizationOption()
    }
    */
    console.log('[EDIT NETWORK] Organizations loaded: ', organizations.value)

    // set the first organization as selected
    if (organizations.value.length > 0) {
        selectedOrgOption.value = organizations.value[0]
    }

    setOrganizationOption()

    orgsLoaded.value = true

    // empty store values if set 
    ids.setNewNetworkId('')
    ids.setNetworkId('')
    ids.setOrgId('')

    devices.setDevicesList([])
    devices.setNetwork('')
    devices.setAddress('')
}

onMounted(() => {
    setup()
})

</script>

<template>
    <div class="container">
        <div class="backbtn">
            <button @click="router.push('/')">Back</button>
        </div>
        <div class="row">
            <div class="col-12">
                <h1>Edit Network</h1>
            </div>
        </div>
        <div class="row">
            <div v-if="orgsLoaded" class="col-r">
                <div class="row">
                    <span class="marg">Organization :</span>
                    <Dropdown :options="organizations" v-model="selectedOrgOption" :onSelect="setOrganizationOption"/>
                </div>
                <div v-if="networksLoaded" class="row">
                    <span class="marg">Network :</span>
                    <Dropdown :options="networkOptions" v-model="selectedNetwork" :onSelect="setNetworkOption"/>
                </div>
            </div>
        </div>
        <div v-if="newNetworkSelected" class="row">
            <div class="col">
                <p>Selected network: {{ selectedNetwork.name }}</p>
                <div class="row">
                    <div class="row marg">
                        <span class="marg">Text to replace:</span>
                        <input class="bigger-input" v-model="regexToReplaceString" type="text"/>
                    </div>
                    <div class="row">
                        <span class="marg">Replacement :</span>
                        <input class="bigger-input" v-model="replacementString" type="text"/>
                    </div>
                </div>
                <hr />
                <div v-if="devicesNamesLoaded" class="col">
                    <div class="row">
                        <div class="col-12">
                            <ul>
                                <li v-for="(highlighted, index) in highlightMatch" :key="index" v-html="highlighted"></li>
                            </ul>
                        </div>
                        <span class="margin-sides-big">-></span>
                        <div class="col-12">
                            <ul>
                                <li v-for="(highlighted, index) in highlightReplacement" :key="index" v-html="highlighted"></li>
                            </ul>
                        </div>
                    </div>
                    <div class="col">
                        <div v-if="changingDeviceName" class="col-12">
                            <p>Changing device names...</p>
                        </div>
                        <div class="col-12">
                            <button @click="confirmChanges">Confirm changes</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="!orgsLoaded" class="row">
            <div class="col-12">
                <p>Loading...</p>
            </div>
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
  padding: 2px 4px;
  border-radius: 4px;
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
}

</style>
