<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { useRoute, useRouter } from 'vue-router'

import { getFirewallRules } from '@/endpoints/networks/GetFirewallRules'
import { getPolicyObjects } from '@/endpoints/organizations/GetPolicyObjects'
import { updateFirewallRules } from '@/endpoints/actionBatches/UpdateFirewallRules'
import { getVlans } from '@/endpoints/networks/GetVlans'

import { getRoutePath } from '@/utils/PageRouter'
import { useBoolStates } from '@/utils/Decorators'
import { parseError } from '@/utils/Misc'

import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Popover from 'primevue/popover'
import TieredMenu from 'primevue/tieredmenu'

const editingRowsL3in = ref([])
const editingRowsL3out = ref([])
const editingRowsCellFail = ref([])
const editingRowsCellIn = ref([])
const editingRowsL7 = ref([])
const editingRowsPortForwarding = ref([])

const addedSrcItems = ref([])
const addedDestItems = ref([])

const portRegex = new RegExp('^([0-9]{1,5}(, ?[0-9]{1,5})*)|([Aa][Nn][Yy])$')  


const onRowEditSave = (event: any, affectedRuleset: any) => {
    console.log('Row edit save event: ', event)

    // update data: affect the event newData to the right item in the affectedRuleset
    let index = affectedRuleset.findIndex(rule => rule.id === event.newData.id)
    Object.assign(affectedRuleset[index], event.newData)

    // clear the added and removed lists
    addedSrcItems.value = []
    addedDestItems.value = []
    addedIps.value = []
    removedSrcCidrs.value = []
    removedDestCidrs.value = []
    removedIps.value = []

    // clear the editing rows
    editingRowsL3in.value = []
    editingRowsL3out.value = []
    editingRowsCellFail.value = []
    editingRowsCellIn.value = []
    editingRowsL7.value = []
    editingRowsPortForwarding.value = []

    // reset the input field
    newCidrInput.value = ''
}

const onRowEditCancel = (event: any, affectedRuleset: any) => {
    console.log('Row edit cancel. Affected ruleset: ', affectedRuleset, ' addedSrcItems: ', addedSrcItems.value, ' removedSrcCidrs: ', removedSrcCidrs.value)
    // remove any added items from the rule, both src and dest
    let index = affectedRuleset.findIndex(rule => rule.id === event.data.id)

    // remove the added items from the rule
    for (const item of addedSrcItems.value) {
        let itemIndex = affectedRuleset[index].srcCidr.findIndex((cidr: any) => cidr.cidr == item.cidr)
        affectedRuleset[index].srcCidr.splice(itemIndex, 1)
    }

    for (const item of addedDestItems.value) {
        let itemIndex = affectedRuleset[index].destCidr.findIndex((cidr: any) => cidr.cidr == item.cidr)
        affectedRuleset[index].destCidr.splice(itemIndex, 1)
    }

    // restore the removed items for both src and dest
    for (const item of removedSrcCidrs.value) {
        affectedRuleset[index].srcCidr.push(item)
    }

    for (const item of removedDestCidrs.value) {
        affectedRuleset[index].destCidr.push(item)
    }

    // remove added ips from the rule
    for (const ip of addedIps.value) {
        let ipIndex = affectedRuleset[index].allowedIps.findIndex((ruleIp: string) => ruleIp == ip)
        affectedRuleset[index].allowedIps.splice(ipIndex, 1)
    }

    // restore removed ips to the rule
    for (const ip of removedIps.value) {
        affectedRuleset[index].allowedIps.push(ip)
    }

    // clear the added and removed lists
    addedSrcItems.value = []
    addedDestItems.value = []
    addedIps.value = []
    removedSrcCidrs.value = []
    removedDestCidrs.value = []
    removedIps.value = []

    // clear the editing rows
    editingRowsL3in.value = []
    editingRowsL3out.value = []
    editingRowsCellFail.value = []
    editingRowsCellIn.value = []
    editingRowsL7.value = []
    editingRowsPortForwarding.value = []

    // reset the input field
    newCidrInput.value = ''

}

const selectedRule = ref()
const selectedRuleType = ref("src")
const cidrEditable = ref(false)

const vlanMenu = ref([
    {
        label: 'Add a vlan',
        items: []
    }
])
const objectsMenu = ref([
    {
        label: 'Add a Policy Object',
        items: []
    }
])

const menuPopoverRef = ref()

// Menu popover show function. sets the rule that's being edited and if the cidr is editable
// the rule param is actually the list of either src or dest cidrs
const showMenuPopover = (event: any, rule: any, cidrEdit: boolean, columnType: string) => {
    selectedRule.value = rule
    cidrEditable.value = cidrEdit

    vlanMenu.value[0].items = []
    objectsMenu.value[0].items = []

    if (columnType === 'src') {
        selectedRuleType.value = 'src'
    } else if (columnType === 'dest') {
        selectedRuleType.value = 'dest'
    }

    // populate available vlans with ones that are not already in the rule. Map them to be menu items
    let newItems = vlans.value.filter(vlan => !rule.some((item: any) => item.type === 'vlan' && item.cidr == vlan.id))
        .map(vlan => (
            {
                label: `${vlan.name} (VLAN ${vlan.id})`,
                command: () => addVlanToRule(vlan)
            }
        )
    )

    for (let i = 0; i < newItems.length; i++) {
        vlanMenu.value[0].items.push(newItems[i])
        if (i < newItems.length - 1) {
            vlanMenu.value[0].items.push({ separator: true })
        }
    }

    // populate available groups with ones that are not already in the rule. Map them to be menu items
    newItems = policyObjects.value.filter(obj => !rule.some((item: any) => item.type === 'group' && item.cidr == obj.name))
        .map(obj => (
            {
                label: `${obj.name}`,
                command: () => addGroupToRule(obj)
            }
        )
    )

    for (let i = 0; i < newItems.length; i++) {
        objectsMenu.value[0].items.push(newItems[i])
        if (i < newItems.length - 1) {
            objectsMenu.value[0].items.push({ separator: true })
        }
    }

    
    menuPopoverRef.value.show(event)
}

const addVlanToRule = (vlan: any) => {
    selectedRule.value.push(
        {
            type: 'vlan',
            cidr: `${vlan.id}`,
            originalStr: `VLAN(${vlan.id})`
        }
    );

    let newItem = {
        type: 'vlan',
        cidr: `${vlan.id}`,
        originalStr: `VLAN(${vlan.id})`
    }

    if (selectedRuleType.value === 'src') {
        addedSrcItems.value.push(newItem)
    } else if (selectedRuleType.value === 'dest') {
        addedDestItems.value.push(newItem)
    }

    // if there was an 'any' cidr in the rule, remove it
    let anyIndex = selectedRule.value.findIndex((item: any) => item.cidr === 'Any')
    if (anyIndex !== -1) {
        selectedRule.value.splice(anyIndex, 1)
        if (selectedRuleType.value === 'src') {
            removedSrcCidrs.value.push({
                type: 'cidr',
                cidr: 'Any',
                originalStr: 'any'
            })
        } else if (selectedRuleType.value === 'dest') {
            removedDestCidrs.value.push({
                type: 'cidr',
                cidr: 'Any',
                originalStr: 'any'
            })
        }
    }

    menuPopoverRef.value.hide()
}

const addGroupToRule = (group: any) => {
    selectedRule.value.push(
        {
            type: 'group',
            cidr: `${group.name}`,
            originalStr: `OBJ(${group.id})`
        }
    );

    let newItem = {
        type: 'group',
        cidr: `${group.name}`,
        originalStr: `OBJ(${group.id})`
    }

    if (selectedRuleType.value === 'src') {
        addedSrcItems.value.push(newItem)
    } else if (selectedRuleType.value === 'dest') {
        addedDestItems.value.push(newItem)
    }

    // if there was an 'any' cidr in the rule, remove it
    let anyIndex = selectedRule.value.findIndex((item: any) => item.cidr === 'Any')
    if (anyIndex !== -1) {
        selectedRule.value.splice(anyIndex, 1)
        if (selectedRuleType.value === 'src') {
            removedSrcCidrs.value.push({
                type: 'cidr',
                cidr: 'Any',
                originalStr: 'any'
            })
        } else if (selectedRuleType.value === 'dest') {
            removedDestCidrs.value.push({
                type: 'cidr',
                cidr: 'Any',
                originalStr: 'any'
            })
        }
    }

    menuPopoverRef.value.hide()
}

const newCidrInput = ref('')

const removedSrcCidrs = ref([])
const removedDestCidrs = ref([])

const addCidrToRule = () => {

    // check if the input is correct
    if (newCidrInput.value.trim() === '') {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Please enter a valid CIDR' })
        return
    }

    // must be either a valid cidr or 'any'
    let cidrRegex = new RegExp('^(([1-9]{0,1}[0-9]{0,2}|2[0-4][0-9]|25[0-5])\.){3}([1-9]{0,1}[0-9]{0,2}|2[0-4][0-9]|25[0-5])\/([12][0-9]|3[0-1]|[1-9])$')

    if (!cidrRegex.test(newCidrInput.value.trim()) && newCidrInput.value.trim().toLowerCase() !== 'any') {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Please enter a valid CIDR or \'Any\'' })
        return
    }

    // case: 'any' cidr : Add all current rules to the removed list, then remove them, then add the 'any' rule
    if (newCidrInput.value.trim().toLowerCase() === 'any') {
        // add all current rules to the removed list
        for (const item of selectedRule.value) {
            if (selectedRuleType.value === 'src') {
                removedSrcCidrs.value.push(item)
            } else if (selectedRuleType.value === 'dest') {
                removedDestCidrs.value.push(item)
            }
        }

        // remove all current rules
        selectedRule.value.splice(0, selectedRule.value.length)
    }

    // if there is a 'any' cidr in the list, remove it and add it to the removed list
    let anyIndex = selectedRule.value.findIndex((item: any) => item.cidr === 'Any')
    if (anyIndex !== -1) {
        selectedRule.value.splice(anyIndex, 1)
        if (selectedRuleType.value === 'src') {
            removedSrcCidrs.value.push({
                type: 'cidr',
                cidr: 'Any',
                originalStr: 'any'
            })
        } else if (selectedRuleType.value === 'dest') {
            removedDestCidrs.value.push({
                type: 'cidr',
                cidr: 'Any',
                originalStr: 'any'
            })
        }
    }

    // handle the added lists : push the new item to the right list
    let newItem;
    if (newCidrInput.value.trim().toLowerCase() === 'any') {
        newItem = {
            type: 'cidr',
            cidr: 'Any',
            originalStr: 'any'
        }
    } else {
        newItem = {
            type: 'cidr',
            cidr: newCidrInput.value.trim(),
            originalStr: newCidrInput.value.trim()
        }
    }

    selectedRule.value.push(newItem)

    if (selectedRuleType.value === 'src') {
        addedSrcItems.value.push(newItem)
    } else if (selectedRuleType.value === 'dest') {
        addedDestItems.value.push(newItem)
    }

    menuPopoverRef.value.hide()
}

const deleteItem = (data: any, index: number, columnType: string) => {

    console.log('Deleting item: ', data, index, columnType)

    if (columnType === 'src') {
        removedSrcCidrs.value.push(data[index])
    } else if (columnType === 'dest') {
        removedDestCidrs.value.push(data[index])
    }

    data.splice(index, 1)

    if (data.length === 0) {
        data.push({ type: 'cidr', cidr: 'Any', originalStr: 'any' })
        if (columnType === 'src') {
            addedSrcItems.value.push({ type: 'cidr', cidr: 'Any', originalStr: 'any' })
        } else if (columnType === 'dest') {
            addedDestItems.value.push({ type: 'cidr', cidr: 'Any', originalStr: 'any' })
        }
    }
}

const newIpInput = ref('')
const addIpPopoverRef = ref()

const addIpData = ref([])

const addedIps = ref([])
const removedIps = ref([])

const showAddIpPopover = (event: any, data: any) => {
    newIpInput.value = ''
    addIpData.value = data
    addIpPopoverRef.value.show(event)
}

const addIpToRule = () => {
    // check if the input is correct
    if (newIpInput.value.trim() === '') {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Please enter a valid IP address' })
        return
    }

    // must be a valid ip address
    let ipRegex = new RegExp('^(([1-9]{0,1}[0-9]{0,2}|2[0-4][0-9]|25[0-5])\.){3}([1-9]{0,1}[0-9]{0,2}|2[0-4][0-9]|25[0-5])$')

    if (!ipRegex.test(newIpInput.value.trim())) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Please enter a valid IP address' })
        return
    }

    addIpData.value.push(newIpInput.value.trim())

    addedIps.value.push(newIpInput.value.trim())

    addIpPopoverRef.value.hide()
}

const deleteIpItem = (data: any, index: number) => {
    removedIps.value.push(data[index])
    data.splice(index, 1)
}

const toast = useToast()

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const firewallRules = ref({} as { [key: string]: any })

const l3inbound = ref([])
const l3outbound = ref([])
const cellularFailover = ref([])
const cellularInbound = ref([])
const firewalledServices = ref([])
const l7rules = ref([])
const portForwardingRules = ref([])
const oneToOneNatRules = ref([])
const oneToManyNatRules = ref([])

const loadingConf = ref(false)
const confLoaded = ref(false)

const policyObjects = ref([] as any[])
const vlans = ref([] as any[])

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

    // add index field to each rule
    l3inbound.value.forEach((rule, index) => rule['id'] = index)
    l3outbound.value.forEach((rule, index) => rule['id'] = index)
    cellularFailover.value.forEach((rule, index) => rule['id'] = index)
    cellularInbound.value.forEach((rule, index) => rule['id'] = index)

    // Upper case the protocol fields except for 'Any'
    l3inbound.value.forEach(rule => rule.protocol = rule.protocol === 'Any' ? rule.protocol : rule.protocol.toUpperCase())
    l3outbound.value.forEach(rule => rule.protocol = rule.protocol === 'Any' ? rule.protocol : rule.protocol.toUpperCase())
    cellularFailover.value.forEach(rule => rule.protocol = rule.protocol === 'Any' ? rule.protocol : rule.protocol.toUpperCase())
    cellularInbound.value.forEach(rule => rule.protocol = rule.protocol === 'Any' ? rule.protocol : rule.protocol.toUpperCase())
    
    // same for port forwarding rules but it can't be 'Any' so always upper case
    portForwardingRules.value.forEach(rule => rule.protocol = rule.protocol.toUpperCase())

    // console.log('firewalledServices: ', firewalledServices.value)


    parseCidrs(l3inbound.value)
    parseCidrs(l3outbound.value)
    parseCidrs(cellularFailover.value)
    parseCidrs(cellularInbound.value)

    console.log('Firewall rules at init: ', l3inbound.value, l3outbound.value, cellularFailover.value, cellularInbound.value);
});

const saving = ref(false)

const confirmChanges = useBoolStates([confLoaded], [confLoaded], async () => {

    saving.value = true

    console.log('Saving changes: firewall ref object ', firewallRules.value)

    // copy the rules into a new object in order to not break the display
    let newFirewallRules = JSON.parse(JSON.stringify(firewallRules.value))

    // collapse the cidrs into a single string
    collapseCidrs(newFirewallRules['inboundFirewallRules'].rules)
    collapseCidrs(newFirewallRules['l3FirewallRules'].rules)
    collapseCidrs(newFirewallRules['cellularFailoverRules'].rules)
    collapseCidrs(newFirewallRules['inboundCellularFirewallRules'].rules)

    // remove all rules called 'Default Rule' from all rulesets (comment field == "Default rule")
    newFirewallRules['inboundFirewallRules'].rules = newFirewallRules['inboundFirewallRules'].rules.filter((rule: any) => rule.comment !== 'Default rule')
    newFirewallRules['l3FirewallRules'].rules = newFirewallRules['l3FirewallRules'].rules.filter((rule: any) => rule.comment !== 'Default rule')
    newFirewallRules['cellularFailoverRules'].rules = newFirewallRules['cellularFailoverRules'].rules.filter((rule: any) => rule.comment !== 'Default rule')
    newFirewallRules['inboundCellularFirewallRules'].rules = newFirewallRules['inboundCellularFirewallRules'].rules.filter((rule: any) => rule.comment !== 'Default rule')

    // save the changes
    console.log('Saving changes: ', newFirewallRules)
    const resp = await updateFirewallRules(newNetworkId.value, newFirewallRules)
    
    console.log('Response: ', resp)

    if (resp.error) {
        // console.error('Error updating firewall rules: ', resp.error)
        let errorStr = parseError(resp.error)
        console.log('Error updating firewall rules: ', errorStr)
        toast.add({ severity: 'error', summary: 'Error', detail: `Error updating firewall rules:\n${errorStr}` })
        saving.value = false
        return
    }

    saving.value = false
    toast.add({ severity: 'success', summary: 'Success', detail: 'Firewall rules updated successfully', life: 5000 })
});

const retrieveVlans = async () => {
    const vlansResp = await getVlans(newNetworkId.value)
    if (vlansResp.error) {
        console.error('Error fetching vlans: ', vlansResp.error)
        return
    }
    console.log('Vlans: ', vlansResp)
    vlans.value = vlansResp
}

onMounted(() => {
    retrieveVlans()
    retrievePolicyObjects()
    retrieveFirewallRules()
})
</script>

<template>
    <div style="width: 75%; margin-top: 40px;">
        <Toast position="top-right" />
        <h1>Firewall Rules</h1>
        <div v-if="loadingConf">Loading...</div>
        <div v-else>
            <div class="col center">
                <h2>L3 Inbound Rules</h2>

                <DataTable :value="l3inbound" style="width: 100%;" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event, l3inbound)" v-model:editingRows="editingRowsL3in" dataKey="id"
                @row-edit-cancel="(event) => onRowEditCancel(event, l3inbound)"
                :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                class: [{ '!py-0': state['d_editing'] }]
                            })
                        }
                    }"
                >
                    <Column field="policy" header="Policy" style="width: 8%;">
                        <template #body="{ data }">
                            <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                            <i class="pi pi-ban" v-else style="color: red;"></i>
                            <span style="margin-left: 15px">{{ data.policy }}</span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.policy" :options="['allow', 'deny']"></Select>
                            <div v-else>
                                <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                                <i class="pi pi-ban" v-else style="color: red;"></i>
                                <span style="margin-left: 15px">{{ data[field] }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="comment" header="Description" style="width: 10%;">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.comment }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.comment" style="width: 120px"/>
                            <div v-else>
                                <span>{{ data.comment }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="protocol" header="Protocol" style="width: 10%">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.protocol }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.protocol" :options="['TCP', 'UDP', 'ICMP', 'Any']"></Select>
                            <div v-else>
                                <span>{{ data.protocol }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcCidr" header="Source" style="width: 17%">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.srcCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'src')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcPort" header="Src Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.srcPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.srcPort" style="width: 120px"
                                :invalid="!portRegex.test(data.srcPort)"
                            />
                            <div v-else>
                                <span>{{ data.srcPort }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="destCidr" header="Destination" style="width: 17%;">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.destCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'dest')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="destPort" header="Dst Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.destPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.destPort" style="width: 120px"
                                :invalid="!portRegex.test(data.destPort)"                            
                            />
                            <div v-else>
                                <span>{{ data.destPort }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column :rowEditor="true" style="width: 8%"></Column>
                </DataTable>
            </div>

            <div class="col center" style="margin-top: 40px;">
                <h2>L3 Outbound Rules</h2>

                <DataTable :value="l3outbound" style="width: 100%;" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event, l3outbound)" v-model:editingRows="editingRowsL3out" dataKey="id"
                @row-edit-cancel="(event) => onRowEditCancel(event, l3outbound)"
                :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                class: [{ '!py-0': state['d_editing'] }]
                            })
                        }
                    }"
                >
                    <Column field="policy" header="Policy" style="width: 8%;">
                        <template #body="{ data }">
                            <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                            <i class="pi pi-ban" v-else style="color: red;"></i>
                            <span style="margin-left: 15px">{{ data.policy }}</span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.policy" :options="['allow', 'deny']"></Select>
                            <div v-else>
                                <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                                <i class="pi pi-ban" v-else style="color: red;"></i>
                                <span style="margin-left: 15px">{{ data[field] }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="comment" header="Description" style="width: 10%;">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.comment }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.comment" style="width: 120px"/>
                            <div v-else>
                                <span>{{ data.comment }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="protocol" header="Protocol" style="width: 10%">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.protocol }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.protocol" :options="['TCP', 'UDP', 'ICMP', 'Any']"></Select>
                            <div v-else>
                                <span>{{ data.protocol }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcCidr" header="Source" style="width: 17%">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.srcCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'src')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcPort" header="Src Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.srcPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.srcPort" style="width: 120px"
                                :invalid="!portRegex.test(data.srcPort)"
                            />
                            <div v-else>
                                <span>{{ data.srcPort }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="destCidr" header="Destination" style="width: 17%;">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.destCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'dest')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="destPort" header="Dst Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.destPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.destPort" style="width: 120px"
                                :invalid="!portRegex.test(data.destPort)"                            
                            />
                            <div v-else>
                                <span>{{ data.destPort }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column :rowEditor="true" style="width: 8%"></Column>
                </DataTable>
            </div>
            <div class="col center" style="margin-top: 40px;">
                <h2>Cellular Failover Rules</h2>

                <!-- 
                    MARK: Cellular Failover Rules
                -->

                <DataTable :value="cellularFailover" style="width: 100%;" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event, l3outbound)" v-model:editingRows="editingRowsCellFail" dataKey="id"
                @row-edit-cancel="(event) => onRowEditCancel(event, l3outbound)"
                :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                class: [{ '!py-0': state['d_editing'] }]
                            })
                        }
                    }"
                >
                    <Column field="policy" header="Policy" style="width: 8%;">
                        <template #body="{ data }">
                            <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                            <i class="pi pi-ban" v-else style="color: red;"></i>
                            <span style="margin-left: 15px">{{ data.policy }}</span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.policy" :options="['allow', 'deny']"></Select>
                            <div v-else>
                                <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                                <i class="pi pi-ban" v-else style="color: red;"></i>
                                <span style="margin-left: 15px">{{ data[field] }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="comment" header="Description" style="width: 10%;">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.comment }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.comment" style="width: 120px"/>
                            <div v-else>
                                <span>{{ data.comment }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="protocol" header="Protocol" style="width: 10%">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.protocol }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.protocol" :options="['TCP', 'UDP', 'ICMP', 'Any']"></Select>
                            <div v-else>
                                <span>{{ data.protocol }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcCidr" header="Source" style="width: 17%">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.srcCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'src')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcPort" header="Src Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.srcPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.srcPort" style="width: 120px"
                                :invalid="!portRegex.test(data.srcPort)"
                            />
                            <div v-else>
                                <span>{{ data.srcPort }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="destCidr" header="Destination" style="width: 17%;">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.destCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'dest')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="destPort" header="Dst Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.destPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.destPort" style="width: 120px"
                                :invalid="!portRegex.test(data.destPort)"                            
                            />
                            <div v-else>
                                <span>{{ data.destPort }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column :rowEditor="true" style="width: 8%"></Column>
                </DataTable>
            </div>
            <div class="col center" style="margin-top: 40px;">
                <h2>Cellular Inbound Rules</h2>
                <!-- MARK: -Cellular Inbound -->
                <DataTable :value="cellularInbound" style="width: 100%;" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event, l3outbound)" v-model:editingRows="editingRowsCellIn" dataKey="id"
                @row-edit-cancel="(event) => onRowEditCancel(event, l3outbound)"
                :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                class: [{ '!py-0': state['d_editing'] }]
                            })
                        }
                    }"
                >
                    <Column field="policy" header="Policy" style="width: 8%;">
                        <template #body="{ data }">
                            <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                            <i class="pi pi-ban" v-else style="color: red;"></i>
                            <span style="margin-left: 15px">{{ data.policy }}</span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.policy" :options="['allow', 'deny']"></Select>
                            <div v-else>
                                <i class="pi pi-check" v-if="data.policy === 'allow'" style="color: green;"></i>
                                <i class="pi pi-ban" v-else style="color: red;"></i>
                                <span style="margin-left: 15px">{{ data[field] }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="comment" header="Description" style="width: 10%;">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.comment }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.comment" style="width: 120px"/>
                            <div v-else>
                                <span>{{ data.comment }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="protocol" header="Protocol" style="width: 10%">
                        <template #body="{ data }">
                            <span :style="{ 'cursor' : data.comment !== 'Default rule' ? 'pointer' : 'not-allowed' }">
                                {{ data.protocol }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-if="data.comment !== 'Default rule'" v-model="data.protocol" :options="['TCP', 'UDP', 'ICMP', 'Any']"></Select>
                            <div v-else>
                                <span>{{ data.protocol }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcCidr" header="Source" style="width: 17%">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.srcCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'src')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'src')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.srcCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="srcPort" header="Src Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.srcPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.srcPort" style="width: 120px"
                                :invalid="!portRegex.test(data.srcPort)"
                            />
                            <div v-else>
                                <span>{{ data.srcPort }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="destCidr" header="Destination" style="width: 17%;">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div v-if="data.comment !== 'Default rule'">
                                <div class="row">
                                    <div class="tags-container add-border">
                                        <div v-for="(cidr, index) in data.destCidr" style="margin: 6px;">
                                            <Tag v-if="cidr.type === 'vlan'">
                                                Vlan {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag class="group-tag" v-if="cidr.type === 'group'">
                                                {{ cidr.cidr }}
                                                <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                            <Tag severity="secondary" v-if="cidr.type === 'cidr'">
                                                {{ cidr.cidr }}
                                                <i v-if="cidr.cidr.toLowerCase() !== 'any'" class="pi pi-times-circle" style="cursor: pointer;" @click="deleteItem(data[field], index, 'dest')"></i>
                                            </Tag>
                                        </div>
                                    </div>
                                    <!--Add the button to open the popover here, pass it data[field] and false (cidr isn't editable for this specific ruleset) -->
                                    <Button @click="showMenuPopover($event, data[field], false, 'dest')" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        style="justify-self: flex-end; margin-left: 15px;"
                                    ></Button>
                                </div>
                            </div>
                            <div v-else>
                                <div v-for="cidr in data.destCidr" style="margin: 6px;">
                                    <Tag v-if="cidr.type === 'vlan'">Vlan {{ cidr.cidr }}</Tag>
                                    <Tag class="group-tag" v-if="cidr.type === 'group'">{{ cidr.cidr }}</Tag>
                                    <Tag severity="secondary" v-if="cidr.type === 'cidr'">{{ cidr.cidr }}</Tag>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="destPort" header="Dst Port" style="width: 13%;">
                        <template #body="{ data }">
                            <span>
                                {{ data.destPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.comment !== 'Default rule'" v-model="data.destPort" style="width: 120px"
                                :invalid="!portRegex.test(data.destPort)"                            
                            />
                            <div v-else>
                                <span>{{ data.destPort }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column :rowEditor="true" style="width: 8%"></Column>
                </DataTable>
            </div>
            <div class="col center" style="margin-top: 40px;">
                <h2>Firewalled Services</h2>
                <DataTable :value="firewalledServices" style="width: 100%;">
                    <Column field="service" header="Service"></Column>
                    <Column field="access" header="Access">
                        <template #body="{ data }">
                            <Select v-model="data.access" :options="['unrestricted', 'restricted', 'blocked']"></Select>
                        </template>
                    </Column>
                    <Column field="allowedIps" header="Allowed IPs">
                        <template #body="{ data }">
                            <Textarea :disabled="data.access !== 'restricted'" v-model="data.allowedIps" autoResize :rows="1"></Textarea>
                        </template>
                    </Column>
                </DataTable>
            </div>
            <div class="col center" style="margin-top: 40px;">
                <div class="row" style="justify-content: center; align-items: center; margin-bottom: 20px">
                    <h2 style="margin: 0;">L7 Rules</h2>
                    <i class="pi pi-ban" style="color: red; margin-left: 10px;"></i>
                </div>
                <DataTable :value="l7rules" style="width: 100%;">
                    <Column field="policy" header="Policy"></Column>
                    <Column field="type" header="Type"></Column>
                    <Column field="value" header="Value"></Column>
                </DataTable>
            </div>
            <div class="col center" style="margin-top: 40px;">
                <h2>Port Forwarding Rules</h2>           
                <DataTable :value="portForwardingRules" style="width: 100%;" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event, portForwardingRules)" v-model:editingRows="editingRowsPortForwarding" dataKey="id"
                @row-edit-cancel="(event) => onRowEditCancel(event, portForwardingRules)"
                :pt="{
                        table: { style: 'min-width: 50rem' },
                        column: {
                            bodycell: ({ state }) => ({
                                class: [{ '!py-0': state['d_editing'] }]
                            })
                        }
                    }"
                >
                    <Column field="name" header="Description"></Column>
                    <Column field="uplink" header="Uplink">
                        <template #body="{ data }">
                            <span>
                                {{ data.uplink }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-model="data.uplink" :options="['both', 'internet1', 'internet2']"></Select>
                        </template>
                    </Column>
                    <Column field="protocol" header="Protocol">
                        <template #body="{ data }">
                            <span>
                                {{ data.protocol }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-model="data.protocol" :options="['TCP', 'UDP']"></Select>
                        </template>
                    </Column>
                    <Column field="publicPort" header="Public Port">
                        <template #body="{ data }">
                            <span>
                                {{ data.publicPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-model="data.publicPort" style="width: 120px"/>
                        </template>
                    </Column>
                    <Column field="lanIp" header="Lan IP">
                        <template #body="{ data }">
                            <span>
                                {{ data.lanIp }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-model="data.lanIp" style="width: 120px"/>
                        </template>
                    </Column>
                    <Column field="localPort" header="Local Port">
                        <template #body="{ data }">
                            <span>
                                {{ data.localPort }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-model="data.localPort" style="width: 120px"/>
                        </template>
                    </Column>
                    <Column field="allowedIps" header="Allowed IPs" style="width: 20%;">
                        <template #body="{ data }">
                            <div class="tags-container">
                                <div v-for="ip in data.allowedIps" style="margin: 6px;">
                                    <Tag severity="secondary">{{ ip }}</Tag>
                                </div>
                            </div>
                        </template>
                        <template #editor="{ data, field }">
                            <div class="row">
                                <div class="tags-container add-border">
                                    <div v-for="(ip, index) in data.allowedIps" style="margin: 6px;">
                                        <Tag severity="secondary">{{ ip }}
                                            <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteIpItem(data.allowedIps, index)"></i>
                                        </Tag>
                                    </div>
                                </div>
                                <Button @click="showAddIpPopover($event, data.allowedIps)" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                    style="justify-self: flex-end; margin-left: 15px;"
                                ></Button>
                            </div>
                        </template>
                    </Column>
                    <Column :rowEditor="true" style="width: 8%"></Column>
                </DataTable>
            </div>
            <!-- div class="col center" style="margin-top: 40px;">
                <h2>1:1 Nat rules</h2>
                <-- table for 1:1 Nat Rules ->
                <div v-for="rule in oneToOneNatRules" :key="rule">
                    <-- top table with info about the first side of the nat mapping->
                    <-- table>
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
                    </table ->
                    <DataTable :value="[rule]" style="width: 100%;">
                        <Column field="name" header="Name"></Column>
                        <Column field="lanIp" header="Lan IP"></Column>
                        <Column field="publicIp" header="Public IP"></Column>
                        <Column field="uplink" header="Uplink"></Column>
                    </DataTable>
                    <h3>Rules</h3>
                    <-- bottom table has the elements iterate over rule.allowedInbound->
                    <-- table>
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
                    </table ->
                    <DataTable :value="rule.allowedInbound" style="width: 100%;">
                        <Column field="protocol" header="Protocol"></Column>
                        <Column field="destinationPorts" header="Ports"></Column>
                        <Column field="allowedIps" header="Remote IPs"></Column>
                    </DataTable>
                </div>
            </div -->
            <!-- div class="firewall-rule-section">
                <h2>1:Many Nat rules</h2>
                <!-- table for 1:Many Nat Rules ->
                <div v-for="rule in oneToManyNatRules" :key="rule">
                    <!-- top table with info about the first side of the nat mapping->
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
                    <!-- bottom table has the elements iterate over rule.portRules->
                    <table>
                        <!-- Is the same structure as port forwarding minus the uplink field->
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
            </div-->
        </div>
        <div class="col center" style="margin-top: 40px; margin-bottom: 60px;">
            <Button @click="confirmChanges" :disabled="saving" class="constant-width-150 constant-height-40">
                <v-progress-circular v-if="saving" indeterminate color="white"></v-progress-circular>
                <span v-else>Save on Meraki</span>
            </Button>
            <div class="row center" style="margin-top: 20px;">
                <Button @click="router.push(getRoutePath(configStore.prevPage()))" style="margin-right: 15px;">Back</Button>
                <Button @click="router.push(getRoutePath(configStore.nextPage()))">Next</Button>
            </div>
        </div>

        <Popover ref="menuPopoverRef">
            <div class="plus-popup">
                <div class="col" style="padding: 15px; justify-content: flex-start;">
                    
                    <!-- Vlans -->
                    <div class="margin">
                        <TieredMenu :model="vlanMenu"></TieredMenu>
                    </div>

                    <!-- Policy Objects -->
                    <div class="margin">
                        <TieredMenu :model="objectsMenu"></TieredMenu>
                    </div>

                    <!-- add cidr input -->
                    <div class="margin row">
                        <InputText v-model="newCidrInput" placeholder="Add a CIDR" style="margin-right: 20px;" :disabled="!cidrEditable"/>
                        <button @click="addCidrToRule()" :disabled="cidrEditable">Add</button>
                    </div>
                </div>
            </div>
        </Popover>

        <Popover ref="addIpPopoverRef">
            <div class="plus-popup">
                <div class="row margin" style="padding: 15px; justify-content: flex-start;">
                    <InputText v-model="newIpInput" placeholder="Add an IP" style="margin-right: 20px"/>
                    <button @click="addIpToRule()">Add</button>
                </div>
            </div>
        </Popover>
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

    .group-tag {
        /* invert the colors of the tag (info severity so it is blue text over light blue background) */
        color: white;
        background-color: var(--p-tag-primary-color);
    }

    .tags-container {
        display: flex;
        flex-wrap: wrap;
        width: 80%;
    }

    .add-border {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 5px;
    }
</style>