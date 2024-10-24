<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { vOnClickOutside } from '@vueuse/components';

import { useRoute, useRouter } from 'vue-router'

import { getFirewallRules } from '@/endpoints/networks/GetFirewallRules'
import { getPolicyObjects } from '@/endpoints/organizations/GetPolicyObjects'
import { updateFirewallRules } from '@/endpoints/actionBatches/UpdateFirewallRules'
import { getActionBatchStatus } from '@/endpoints/actionBatches/GetActionBatch'

import { getRoutePath } from '@/utils/PageRouter'
import { useBoolStates } from '@/utils/Decorators'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const firewallRules = ref({} as { [key: string]: any })

const l3inbound = ref({} as { [key: string]: any }[])
const l3outbound = ref({} as { [key: string]: any }[])
const cellularFailover = ref({} as { [key: string]: any }[])
const cellularInbound = ref({} as { [key: string]: any }[])
const firewalledServices = ref({} as { [key: string]: any }[])
const l7rules = ref({} as { [key: string]: any }[])
const portForwardingRules = ref({} as { [key: string]: any }[])
const oneToOneNatRules = ref({} as { [key: string]: any }[])
const oneToManyNatRules = ref({} as { [key: string]: any }[])

const loadingConf = ref(false)
const confLoaded = ref(false)

// popup related
const showPopup = ref(false)
const newCidr = ref('')
const openDestPopup = (rule: any) => {
    rule.showDestPopup = true
}

const closeDestPopup = (rule: any) => {
    rule.showDestPopup = false
    // reset the input field after 250ms
    setTimeout(() => {
        newCidr.value = ''
    }, 250)
}

const openSrcPopup = (rule: any) => {
    rule.showSrcPopup = true
}

const closeSrcPopup = (rule: any) => {
    rule.showSrcPopup = false
    // reset the input field after 250ms
    setTimeout(() => {
        newCidr.value = ''
    }, 250)
}

const policyObjects = ref([] as any[])

const parseCidrList = (cidrs: string[]) => {
    let parsedCidrs = []
    for (const cidr of cidrs) {
        if (cidr.includes('VLAN')) {
            let vlanNb = cidr.split('(')[1].split(')')[0]
            parsedCidrs.push({ type: 'vlan', cidr: vlanNb, originalStr: cidr })
        } else if (cidr.includes('OBJ')) {
            // object id:
            let objId = cidr.split('(')[1].split(')')[0]
            // get the object name from the policyObject list
            let objName = policyObjects.value.find(obj => obj.id === objId).name
            parsedCidrs.push({ type: 'group', cidr: objName, originalStr: cidr })
        } else {
            parsedCidrs.push({ type: 'cidr', cidr: cidr, originalStr: cidr })
        }
    }

    return parsedCidrs
}

const parseCidrs = (ruleset: { [key: string]: any}[]) => {
    for (const rule of ruleset) {
        let srcCidrs = rule.srcCidr.split(',')
        let destCidrs = rule.destCidr.split(',')

        rule.srcCidr = parseCidrList(srcCidrs)
        rule.destCidr = parseCidrList(destCidrs)
    }
}

// the opposite of parseCidrs, this function will take a ruleset and collapse the cidrs { type: str, cidr: str }[] into a single string using the originalStr field
// if the cidr is of type 'cidr', add the cidr field instead of the originalStr field
const collapseCidrs = (ruleset: { [key: string]: any}[]) => {
    for (const rule of ruleset) {
        let srcCidrs = rule.srcCidr.map((cidr: { type: string, cidr: string, originalStr: string }) => cidr.type === 'cidr' ? cidr.cidr : cidr.originalStr)
        let destCidrs = rule.destCidr.map((cidr: { type: string, cidr: string, originalStr: string }) => cidr.type === 'cidr' ? cidr.cidr : cidr.originalStr)

        rule.srcCidr = srcCidrs.join(',')
        rule.destCidr = destCidrs.join(',')
    }
}

const addDestCidr = (cidrs: { [key: string]: any }[], input: string, rule: any) => {
    cidrs.push({ type: 'cidr', cidr: input, originalStr: input })
    closeDestPopup(rule)
}

const addSrcCidr = (cidrs: { [key: string]: any }[], input: string, rule: any) => {
    cidrs.push({ type: 'cidr', cidr: input, originalStr: input })
    closeSrcPopup(rule)
}

const retrievePolicyObjects = async () => {
    const policyObjectsResponse = await getPolicyObjects(orgId.value)
    if (policyObjectsResponse.error) {
        console.error('Error fetching policy objects: ', policyObjectsResponse.error)
        return
    }

    policyObjects.value = policyObjectsResponse
}

const retrieveFirewallRules = useBoolStates([loadingConf],[confLoaded],async () => {
    const firewallRulesResponse = await getFirewallRules(newNetworkId.value)
    if (firewallRulesResponse.error) {
        console.error('Error fetching firewall rules: ', firewallRulesResponse.error)
        return
    }

    firewallRules.value = firewallRulesResponse

    l3inbound.value = firewallRulesResponse['inboundFirewallRules'].rules
    l3outbound.value = firewallRulesResponse['l3FirewallRules'].rules
    cellularFailover.value = firewallRulesResponse['cellularFailoverRules'].rules
    cellularInbound.value = firewallRulesResponse['inboundCellularFirewallRules'].rules
    firewalledServices.value = firewallRulesResponse['wanApplianceServices']
    l7rules.value = firewallRulesResponse['l7FirewallRules'].rules
    portForwardingRules.value = firewallRulesResponse['portForwardingRules'].rules
    oneToOneNatRules.value = firewallRulesResponse['oneToOneNatRules'].rules
    oneToManyNatRules.value = firewallRulesResponse['oneToManyNatRules'].rules

    console.log('firewalledServices: ', firewalledServices.value)


    parseCidrs(l3inbound.value)
    parseCidrs(l3outbound.value)
    parseCidrs(cellularFailover.value)
    parseCidrs(cellularInbound.value)
});

const confirmChanges = useBoolStates([confLoaded], [confLoaded], async () => {

    console.log('Saving changes: firewall ref object ', firewallRules.value)

    // copy the rules into a new object in order to not break the display
    let newFirewallRules = JSON.parse(JSON.stringify(firewallRules.value))

    // collapse the cidrs into a single string
    collapseCidrs(newFirewallRules['inboundFirewallRules'].rules)
    collapseCidrs(newFirewallRules['l3FirewallRules'].rules)
    collapseCidrs(newFirewallRules['cellularFailoverRules'].rules)
    collapseCidrs(newFirewallRules['inboundCellularFirewallRules'].rules)

    // save the changes
    console.log('Saving changes: ', newFirewallRules)
    const resp = await updateFirewallRules(newNetworkId.value, newFirewallRules)
    
    console.log('Response: ', resp)
    
});

onMounted(() => {
    retrievePolicyObjects()
    retrieveFirewallRules()
})
</script>

<template>
    <div>
        <h1>Firewall Rules</h1>
        <div v-if="loadingConf">Loading...</div>
        <div v-else>
            <div class="firewall-rule-section">
                <h2>L3 Inbound Rules</h2>
                <!-- table for L3 Inbound Rules -->
                <table>
                    <thead>
                        <tr>
                            <th>Policy</th>
                            <th>Description</th>
                            <th>Protocol</th>
                            <th>Source</th>
                            <th>Src Port</th>
                            <th>Destination</th>
                            <th>Dst Port</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="firewall-rule-line" v-for="rule in l3inbound" :key="rule">
                            <td>{{ rule.policy }}</td>
                            <td>{{ rule.comment }}</td>
                            <td>{{ rule.protocol }}</td>
                            <td>
                                <div v-for="cidr in rule.srcCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.srcPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                            <td>
                                <div v-for="cidr in rule.destCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.destPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="firewall-rule-section">
                <h2>L3 Outbound Rules</h2>
                <!-- table for L3 Outbound Rules -->
                <table>
                    <thead>
                        <tr>
                            <th>Policy</th>
                            <th>Description</th>
                            <th>Protocol</th>
                            <th>Source</th>
                            <th>Src Port</th>
                            <th>Destination</th>
                            <th>Dst Port</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="firewall-rule-line" v-for="rule in l3outbound" :key="rule">
                            <td>{{ rule.policy }}</td>
                            <td>{{ rule.comment }}</td>
                            <td>{{ rule.protocol }}</td>
                            <td>
                                <div v-for="cidr in rule.srcCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                                <div class="plus-button-container" v-on-click-outside="() => closeSrcPopup(rule)">
                                    <button class="plus-button" @click="openSrcPopup(rule)">
                                        <img src="@/assets/plus.png" alt="Add CIDR">
                                    </button>
                                    <div class="plus-popup" v-if="rule.showSrcPopup">
                                        <input type="text" v-model="newCidr" placeholder="CIDR"/>
                                        <button @click="addSrcCidr(rule.srcCidr, newCidr, rule)">Add</button>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.srcPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                            <td>
                                <div v-for="cidr in rule.destCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                                <div class="plus-button-container" v-on-click-outside="() => closeDestPopup(rule)">
                                    <button class="plus-button" @click="openDestPopup(rule)">
                                        <img src="@/assets/plus.png" alt="Add CIDR">
                                    </button>
                                    <div class="plus-popup" v-if="rule.showDestPopup">
                                        <input type="text" v-model="newCidr" placeholder="CIDR"/>
                                        <button @click="addDestCidr(rule.destCidr, newCidr, rule)">Add</button>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.destPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="firewall-rule-section">
                <h2>Cellular Failover Rules</h2>
                <!-- table for Cellular Failover Rules -->
                <table>
                    <thead>
                        <tr>
                            <th>Policy</th>
                            <th>Description</th>
                            <th>Protocol</th>
                            <th>Source</th>
                            <th>Src Port</th>
                            <th>Destination</th>
                            <th>Dst Port</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="firewall-rule-line" v-for="rule in cellularFailover" :key="rule">
                            <td>{{ rule.policy }}</td>
                            <td>{{ rule.comment }}</td>
                            <td>{{ rule.protocol }}</td>
                            <td>
                                <div v-for="cidr in rule.srcCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.srcPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                            <td>
                                <div v-for="cidr in rule.destCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.destPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="firewal-rule-section">
                <h2>Cellular Inbound Rules</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Policy</th>
                            <th>Description</th>
                            <th>Protocol</th>
                            <th>Source</th>
                            <th>Src Port</th>
                            <th>Destination</th>
                            <th>Dst Port</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="firewall-rule-line" v-for="rule in cellularInbound" :key="rule">
                            <td>{{ rule.policy }}</td>
                            <td>{{ rule.comment }}</td>
                            <td>{{ rule.protocol }}</td>
                            <td>
                                <div v-for="cidr in rule.srcCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.srcPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                            <td>
                                <div v-for="cidr in rule.destCidr">
                                    <div class="vlan-cidr" v-if="cidr.type === 'vlan'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <div class="group-cidr" v-if="cidr.type === 'group'">
                                        {{ cidr.cidr }}
                                    </div>
                                    <input class="cidr" v-if="cidr.type === 'cidr'" v-model="cidr.cidr"></input>
                                </div>
                            </td>
                            <td>
                                <v-textarea v-model="rule.destPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="firewall-rule-section">
                <h2>Firewalled Services</h2>
                <!-- firewalled service is special, its a list of : "service", "access" ("unrestricted", "restricted", "blocked"), and "allowedIps" if access is restricted.
                 put 3 buttons for each service, one for each access type, and a text field for allowedIps.
                 when the user clicks on a button, change the access type, and if the access type is restricted, enable the text field -->
                <div class="make-col" v-for="service in firewalledServices" :key="service">
                    <h3>{{ service.service }}</h3>
                    <div class="make-col">
                        <div class="make-row">
                            <button class="margin" :class="{ 'active': service.access === 'unrestricted'}" @click="service.access = 'unrestricted'">Any</button>
                            <button class="margin" :class="{ 'active': service.access === 'restricted' }" @click="service.access = 'restricted'">Enter values</button>
                            <button class="margin" :class="{ 'active': service.access === 'blocked' }" @click="service.access = 'blocked'">None</button>
                        </div>
                        <input class="margin" :enabled="service.access === 'restricted'" v-model="service.allowedIps" placeholder="Allowed IPs"></input>
                    </div>
                </div>
            </div>
            <div class="firewall-rule-section">
                <h2>L7 Rules</h2>
                <!-- table for L7 Rules -->
                <table>
                    <thead>
                        <tr>
                            <th>Policy</th>
                            <th>Type</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="firewall-rule-line" v-for="rule in l7rules" :key="rule">
                            <td>{{ rule.policy }}</td>
                            <td>
                                <input v-model="rule.type"></input>
                            </td>
                            <td>
                                <v-textarea v-model="rule.value" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="firewall-rule-section">
                <h2>Port Forwarding Rules</h2>
                <!-- table for Port Forwarding Rules -->
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Uplink</th>
                            <th>Protocol</th>
                            <th>Public port</th>
                            <th>Lan IP</th>
                            <th>Local port</th>
                            <th>Allowed remote IPs</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="firewall-rule-line" v-for="rule in portForwardingRules" :key="rule">
                            <td>{{ rule.name }}</td>
                            <td>{{ rule.uplink }}</td>
                            <td>{{ rule.protocol }}</td>
                            <td>
                                <v-textarea v-model="rule.publicPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                            <td>
                                <v-textarea v-model="rule.lanIp" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                            <td>
                                <v-textarea v-model="rule.localPort" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                            <td>
                                <v-textarea v-model="rule.allowedIps" variant="outlined" rows="1" auto-grow></v-textarea>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="firewall-rule-section">
                <h2>1:1 Nat rules</h2>
                <!-- table for 1:1 Nat Rules -->
                <div v-for="rule in oneToOneNatRules" :key="rule">
                    <!-- top table with info about the first side of the nat mapping-->
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Lan Ip</th>
                                <th>Public Ip</th>
                                <th>Uplink</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{{ rule.name }}</td>
                                <td>{{ rule.lanIp }}</td>
                                <td>{{ rule.publicIp }}</td>
                                <td>{{ rule.uplink }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <h3>Rules</h3>
                    <!-- bottom table has the elements iterate over rule.allowedInbound-->
                    <table>
                        <thead>
                            <tr class="firewall-rule-line">
                                <th>Protocol</th>
                                <th>Ports</th>
                                <th>Remote Ips</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="firewall-rule-line" v-for="inboundRule in rule.allowedInbound" :key="inboundRule">
                                <td>
                                    <input v-model="inboundRule.protocol"></input>
                                </td>
                                <td>
                                    <v-textarea v-model="inboundRule.destinationPorts" variant="outlined" rows="1" auto-grow></v-textarea>
                                </td>
                                <td>
                                    <v-textarea v-model="inboundRule.allowedIps" variant="outlined" rows="1" auto-grow></v-textarea>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="firewall-rule-section">
                <h2>1:Many Nat rules</h2>
                <!-- table for 1:Many Nat Rules -->
                <div v-for="rule in oneToManyNatRules" :key="rule">
                    <!-- top table with info about the first side of the nat mapping-->
                    <table>
                        <thead>
                            <tr>
                                <th>Public Ip</th>
                                <th>Uplink</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="firewall-rule-line">
                                <td>{{ rule.publicIp }}</td>
                                <td>{{ rule.uplink }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <h3>Rules</h3>
                    <!-- bottom table has the elements iterate over rule.portRules-->
                    <table>
                        <!-- Is the same structure as port forwarding minus the uplink field-->
                        <thead>
                            <tr class="firewall-rule-line">
                                <th>Description</th>
                                <th>Protocol</th>
                                <th>Public port</th>
                                <th>Lan IP</th>
                                <th>Local port</th>
                                <th>Allowed remote IPs</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="firewall-rule-line" v-for="portRule in rule.portRules" :key="portRule">
                                <td>{{ portRule.name }}</td>
                                <td>
                                    <input v-model="portRule.protocol"></input>
                                </td>
                                <td>
                                    <v-textarea v-model="portRule.publicPort" variant="outlined" rows="1" auto-grow></v-textarea>
                                </td>
                                <td>
                                    <v-textarea v-model="portRule.localIp" variant="outlined" rows="1" auto-grow></v-textarea>
                                </td>
                                <td>
                                    <v-textarea v-model="portRule.localPort" variant="outlined" rows="1" auto-grow></v-textarea>
                                </td>
                                <td>
                                    <v-textarea v-model="portRule.allowedIps" variant="outlined" rows="1" auto-grow></v-textarea>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <button @click="router.push(getRoutePath(configStore.prevPage()))">Back</button>
        <button @click="router.push(getRoutePath(configStore.nextPage()))">Next</button>
        <button @click="confirmChanges">Save</button>
    </div>
</template>

<style scoped>
    .firewall-rule-section {
        margin-top: 20px;
        justify-content: center;
        border: 1px solid #ccc;
        padding: 10px;
    }

    table {
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
    }

    th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        max-width: 200px;
        height: fit-content;
    }

    .vlan-cidr {
        background-color: #366ce0;
        padding: 5px 10px;
        margin: 5px;
        border-radius: 8px;
        border: none;
        color: white;
    }

    .group-cidr {
        background-color: #366ce0;
        padding: 3px 10px;
        margin: 5px;
        border-radius: 8px;
        border: none;
        color: white;
    }

    .cidr {
        padding: 5px 10px;
        margin: 5px;
        border: 1px solid #ccc;
    }

    .plus-button-container {
        display: inline-block;
        position: relative;
    }

    .plus-button {
        background-color: #366ce0;
        margin: 5px;
        cursor: pointer;
        border: none;
        border-radius: 4px;
        height: 24px;
        width: 24px;
    }

    .plus-popup {
        position: absolute;
        background-color: #f9f9f9;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 10px;
        left: 0;
        z-index: 100;
    }

    .plus-popup input {
        margin-right: 10px;
    }

    .plus-popup button {
        padding: 5px 10px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
    }

    .plus-popup button:hover {
        background-color: #0056b3;
    }

    .active {
        background-color: #007bff;
        color: white;
    }

    .make-col {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .make-row {
        display: flex;
        flex-direction: row;
        justify-content: center;
    }

    .margin {
        margin-top: 10px;
    }
</style>