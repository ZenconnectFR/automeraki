<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { useNextStatesStore } from '@/stores/nextStates'
import { storeToRefs } from 'pinia'

import { useRoute, useRouter } from 'vue-router'

import { getFirewallRules } from '@/endpoints/networks/GetFirewallRules'
import { getPolicyObjects } from '@/endpoints/organizations/GetPolicyObjects'
import { updateFirewallRules } from '@/endpoints/actionBatches/UpdateFirewallRules'
import { getVlans } from '@/endpoints/networks/GetVlans'
import { getApplications } from '@/endpoints/networks/GetApplications'

import { getRoutePath } from '@/utils/PageRouter'
import { useBoolStates } from '@/utils/Decorators'
import { parseError } from '@/utils/Misc'

import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Popover from 'primevue/popover'
import TieredMenu from 'primevue/tieredmenu'
import { rule } from 'postcss'

const editingRowsL3in = ref([] as any[])
const editingRowsL3out = ref([] as any[])
const editingRowsCellFail = ref([] as any[])
const editingRowsCellIn = ref([] as any[])
const editingRowsL7 = ref([] as any[])
const editingRowsPortForwarding = ref([] as any[])

const addedSrcItems = ref([] as any[])
const addedDestItems = ref([] as any[])

const portRegex = new RegExp('^([0-9]{1,5}(, ?[0-9]{1,5})*)|([Aa][Nn][Yy])$')

const onRowEditSave = (event: any, affectedRuleset: any) => {
    console.log('Row edit save event: ', event)

    // update data: affect the event newData to the right item in the affectedRuleset
    let index = affectedRuleset.findIndex((rule: { id: any }) => rule.id === event.newData.id)
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
    let index = affectedRuleset.findIndex((rule: { id: any }) => rule.id === event.data.id)

    console.log('Index: ', index, ' Rule: ', affectedRuleset[index])

    // for each item in addedSrcItems, if it is also in removedSrcCidrs, remove it from both lists
    for (const addedItem of addedSrcItems.value) {
        let removedIndex = removedSrcCidrs.value.findIndex(removedItem => removedItem.cidr === addedItem.cidr)
        if (removedIndex !== -1) {
            console.log('Found item in both lists: ', addedItem)
            removedSrcCidrs.value.splice(removedIndex, 1)
            let addedIndex = addedSrcItems.value.findIndex(addedItem => addedItem.cidr === addedItem.cidr)
            addedSrcItems.value.splice(addedIndex, 1)
        }
    }

    // same for dest items
    for (const addedItem of addedDestItems.value) {
        let removedIndex = removedDestCidrs.value.findIndex(removedItem => removedItem.cidr === addedItem.cidr)
        if (removedIndex !== -1) {
            console.log('Found item in both lists: ', addedItem)
            removedDestCidrs.value.splice(removedIndex, 1)
            let addedIndex = addedDestItems.value.findIndex(addedItem => addedItem.cidr === addedItem.cidr)
            addedDestItems.value.splice(addedIndex, 1)
        }
    }

    // remove duplicate items from the added and removed lists
    addedSrcItems.value = addedSrcItems.value.filter((item, index, self) => self.findIndex(t => t.cidr === item.cidr) === index)
    addedDestItems.value = addedDestItems.value.filter((item, index, self) => self.findIndex(t => t.cidr === item.cidr) === index)

    removedSrcCidrs.value = removedSrcCidrs.value.filter((item, index, self) => self.findIndex(t => t.cidr === item.cidr) === index)
    removedDestCidrs.value = removedDestCidrs.value.filter((item, index, self) => self.findIndex(t => t.cidr === item.cidr) === index)

    // remove the added items from the rule
    for (const item of addedSrcItems.value) {
        console.log('From addedSrcItems, removing: ', item)
        let itemIndex = affectedRuleset[index].srcCidr.findIndex((cidr: any) => cidr.cidr == item.cidr)
        affectedRuleset[index].srcCidr.splice(itemIndex, 1)
    }

    for (const item of addedDestItems.value) {
        console.log('From addedDestItems, removing: ', item)
        let itemIndex = affectedRuleset[index].destCidr.findIndex((cidr: any) => cidr.cidr == item.cidr)
        affectedRuleset[index].destCidr.splice(itemIndex, 1)
    }

    // restore the removed items for both src and dest
    for (const item of removedSrcCidrs.value) {
        console.log('From removedSrcCidrs, restoring: ', item)
        affectedRuleset[index].srcCidr.push(item)
    }

    for (const item of removedDestCidrs.value) {
        console.log('From removedDestCidrs, restoring: ', item)
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
const groupEditable = ref(false)
const vlanEditable = ref(false)

const vlanMenu = ref([
    {
        label: 'Add a vlan',
        items: []
    }
] as any[])
const objectsMenu = ref([
    {
        label: 'Add a Policy Object',
        items: []
    }
] as any[])

const menuPopoverRef = ref()

// Menu popover show function. sets the rule that's being edited and if the cidr is editable
// the rule param is actually the list of either src or dest cidrs
const showMenuPopover = (event: any, rule: any, cidrEdit: boolean, groupeEdit: boolean, columnType: string) => {
    selectedRule.value = rule
    cidrEditable.value = cidrEdit
    groupEditable.value = groupeEdit

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
            originalStr: `VLAN(${vlan.id}).*`
        }
    );

    let newItem = {
        type: 'vlan',
        cidr: `${vlan.id}`,
        originalStr: `VLAN(${vlan.id}).*`
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

const removedSrcCidrs = ref([] as any[])
const removedDestCidrs = ref([] as any[])

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

const addIpData = ref([] as string[])

const addedIps = ref([] as string[])
const removedIps = ref([] as string[])

const showAddIpPopover = (event: any, data: any) => {
    newIpInput.value = ''
    addIpData.value = data
    console.log('Showing add ip popover: with addIpData: ', JSON.parse(JSON.stringify(data)))
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

const deleteRow = (ruleset: any, index: number) => {
    console.log('Deleting row: ', ruleset, index)
    ruleset.splice(index, 1)

    // reindex the rules
    ruleset.forEach((rule: any, index: number) => rule.id = index)
}

const toast = useToast()

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()
const nextStates = useNextStatesStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { currentPageConfig, currentPageIndex } = storeToRefs(configStore)
let config = currentPageConfig.value
let thisState = nextStates.getState(currentPageIndex.value)

const firewallRules = ref({} as { [key: string]: any })

const l3inbound = ref([] as { id: number, [key: string]: any }[])
const l3outbound = ref([] as { id: number, [key: string]: any }[])
const cellularFailover = ref([] as { id: number, [key: string]: any }[])
const cellularInbound = ref([] as { id: number, [key: string]: any }[])
const firewalledServices = ref([] as { id: number, [key: string]: any }[])
const l7rules = ref([] as { id: number, [key: string]: any }[])
const portForwardingRules = ref([] as { id: number, [key: string]: any }[])
const oneToOneNatRules = ref([] as { id: number, [key: string]: any }[])
const oneToManyNatRules = ref([] as { id: number, [key: string]: any }[])

const collapsedRules = ref({
    l3inbound: {
        rules: l3inbound as any,
        cidrEditable: false,
        groupEditable: false,
        editingRows: editingRowsL3in.value,
        title: 'L3 Inbound Rules'
    },
    l3outbound: {
        rules: l3outbound as any,
        cidrEditable: true,
        groupEditable: true,
        editingRows: editingRowsL3out.value,
        title: 'L3 Outbound Rules'
    },
    cellularFailover: {
        rules: cellularFailover as any,
        cidrEditable: true,
        groupEditable: true,
        editingRows: editingRowsCellFail.value,
        title: 'Cellular Failover Rules'
    },
    cellularInbound: {
        rules: cellularInbound as any,
        cidrEditable: false,
        groupEditable: false,
        editingRows: editingRowsCellIn.value,
        title: 'Cellular Inbound Rules'
    }
});

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

    console.log('Firewall rules response at init: ', JSON.parse(JSON.stringify(firewallRulesResponse)));

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
    firewalledServices.value.forEach((rule, index) => rule['id'] = index)
    l7rules.value.forEach((rule, index) => rule['id'] = index)
    portForwardingRules.value.forEach((rule, index) => rule['id'] = index)
    oneToOneNatRules.value.forEach((rule, index) => rule['id'] = index)
    oneToManyNatRules.value.forEach((rule, index) => rule['id'] = index)

    // Upper case the protocol fields except for 'Any'
    l3inbound.value.forEach(rule => rule.protocol = rule.protocol.toLowerCase() === 'any' ? 'Any' : rule.protocol.toUpperCase())
    l3outbound.value.forEach(rule => rule.protocol = rule.protocol.toLowerCase() === 'any' ? 'Any' : rule.protocol.toUpperCase())
    cellularFailover.value.forEach(rule => rule.protocol = rule.protocol.toLowerCase() === 'any' ? 'Any' : rule.protocol.toUpperCase())
    cellularInbound.value.forEach(rule => rule.protocol = rule.protocol.toLowerCase() === 'any' ? 'Any' : rule.protocol.toUpperCase())
    
    // same for port forwarding rules but it can't be 'Any' so always upper case
    portForwardingRules.value.forEach(rule => rule.protocol = rule.protocol.toUpperCase())

    console.log("L7 before modifications", JSON.parse(JSON.stringify(l7rules.value)))
    
    // modify the l7rules to always have both a 'value' and 'objValue' field
    // if the type field is 'application' or 'applicationCategory', move the value field to objValue and add an empty value field
    // else, add an empty objValue field and keep the value field
    // objValue contains { name: str, value: str }
    l7rules.value.forEach(rule => {
        if (rule.type === 'application' || rule.type === 'applicationCategory') {
            rule["objValue"] = { name: rule.value.name, id: rule.value.id }
            rule.value = ''
        } else {
            rule["objValue"] = { name: '', value: '' }
        }
    })

    // add the categoryId field to the l7rules, if the type is 'host', 'port' or 'ipRange', the categoryId is the type value, else, it's the id of the category which we need to find as the value object contains the app id and not the category it belongs to
    l7rules.value.forEach(rule => {
        if (rule.type === 'host' || rule.type === 'port' || rule.type === 'ipRange') {
            console.log('Rule type: ', rule.type)
            rule["categoryId"] = rule.type
        } else {
            let category = applications.value.find((category: { items: any[] }) => category.items.some((app: any) => app.id === rule.objValue.id))
            // if not found, it's a category itself
            console.log('Category: ', category)
            if (!category) {
                console.log('Category not found, using the rule object value id: ', rule.objValue.id)
                rule["categoryId"] = rule.objValue.id
            } else {
                console.log('Category found: ', category)
                rule["categoryId"] = category.categoryId
            }
        }
    })

    // if the type is applicationCategory, prepend 'All ' to the value name
    l7rules.value.forEach(rule => {
        if (rule.type === 'applicationCategory') {
            rule.objValue.name = `All ${rule.objValue.name}`
        }
    })

    console.log('Modified l7 rules: ', JSON.parse(JSON.stringify(l7rules.value)))

    // Add an "allowedIps" field to all firewalled services if it doesn't exist
    firewalledServices.value.forEach(rule => {
        if (!rule.allowedIps) {
            rule["allowedIps"] = []
        }
    })

    // parse the cidrs
    parseCidrs(l3inbound.value)
    parseCidrs(l3outbound.value)
    parseCidrs(cellularFailover.value)
    parseCidrs(cellularInbound.value)

    console.log('Firewall rules at init: ', l3inbound.value, l3outbound.value, cellularFailover.value, cellularInbound.value);
});

const saving = ref(false)

const parseL7rules = (newRulesObject: any) => {
    // parse the l7rules to fit the API format
    newRulesObject['l7FirewallRules'].rules.forEach((rule: any) => {
        if (rule.categoryId === 'host' || rule.categoryId === 'port' || rule.categoryId === 'ipRange') {
            rule.type = rule.categoryId
            rule.value = `${rule.value}`
        } else {
            // distinguish between application and applicationCategory
            let foundToBeCategory = applications.value.find((app: { categoryId: any }) => app.categoryId == rule.objValue.id) ? true : false
            if (foundToBeCategory) {
                rule.type = 'applicationCategory'
            } else {
                rule.type = 'application'
            }
            rule.value = rule.objValue
        }

        // clear other useless fields
        delete rule.categoryId
        delete rule.objValue
        delete rule.id
    })
}

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

    // parse the l7rules to fit the API format
    parseL7rules(newFirewallRules)

    // for each firewalled service, if the access is not "restricted", remove the allowedIps field
    newFirewallRules['wanApplianceServices'].forEach((rule: any) => {
        if (rule.access !== 'restricted') {
            delete rule.allowedIps
        }
    })

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

    thisState = true;
    nextStates.setStateTrue(currentPageIndex.value)
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

const applications = ref([] as any[])

const retrieveApplications = async () => {
    const applicationsResp = await getApplications(newNetworkId.value)
    if (applicationsResp.error) {
        console.error('Error fetching applications: ', applicationsResp.error)
        return
    }
    console.log('Applications: ', applicationsResp)

    let newApplications = [{
        name: 'HTTP Hostname',
        value: 'host',
        categoryId: 'host',
        items: [] as any[]
    }, {
        name: 'Port',
        value: 'port',
        categoryId: 'port',
        items: [] as any[]
    }, {
        name: 'Remote IP Range and optionnal port',
        value: 'ipRange',
        categoryId: 'ipRange',
        items: [] as any[]
    }] as any[]

    for (const category of applicationsResp.applicationCategories) {
        let firstApp = {
            name: `All ${category.name}`,
            id: category.id,
        }

        let newCategory = {
            name: category.name,
            value: 'application',
            categoryId: category.id,
            items: [firstApp]
        }

        for (const app of category.applications) {
            newCategory.items.push(app)
        }

        newApplications.push(newCategory)
    }

    applications.value = newApplications

    console.log('Applications: ', applications.value)
}

const back = () => {
    router.push(getRoutePath(configStore.prevPage()))
}

const nextPage = () => {
    router.push(getRoutePath(configStore.nextPage()))
}

const addBasicRule = (ruleset: any) => {
    ruleset.push({
        policy: 'allow',
        comment: 'New rule',
        protocol: 'Any',
        srcCidr: [{ type: 'cidr', cidr: 'Any', originalStr: 'any' }],
        srcPort: 'Any',
        destCidr: [{ type: 'cidr', cidr: 'Any', originalStr: 'any' }],
        destPort: 'Any',
        id: ruleset.length
    })
}

const addL7Rule = () => {
    l7rules.value.push({
        policy: 'deny',
        type: 'host',
        value: 'example.com',
        categoryId: 'host',
        objValue: { name: '', value: '' },
        id: l7rules.value.length
    })
}

onMounted(() => {
    retrieveVlans()
    retrievePolicyObjects()
    retrieveApplications()
    retrieveFirewallRules()
})
</script>

<template>
    <div style="width: 75%; margin-top: 40px;">
        <Toast position="top-right" />
        <h1>Firewall Rules</h1>
        <div v-if="!loadingConf">

            <div class="col center" style="margin-top: 40px"
                v-for="(ruleset, key) in collapsedRules" :key="key">

                <h2>{{ ruleset.title }}</h2>
                <DataTable :value="ruleset.rules" style="width: 100%;" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event, ruleset.rules)" v-model:editingRows="ruleset.editingRows"
                @row-edit-cancel="(event) => onRowEditCancel(event, ruleset.rules)"
                :pt="{
                        table: { style: 'min-width: 50rem' }
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
                                <Button @click="showMenuPopover($event, data[field], ruleset.cidrEditable, ruleset.groupEditable, 'src')" icon="pi pi-plus" class="p-button-rounded p-button-text"
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
                                <Button @click="showMenuPopover($event, data[field], ruleset.cidrEditable, ruleset.groupEditable, 'dest')" icon="pi pi-plus" class="p-button-rounded p-button-text"
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

                <Column :rowEditor="true" style="width: 9%"></Column>

                <Column style="width: 0px">
                    <template #body="{ data }">
                        <Button @click="deleteRow(ruleset.rules, data.id)" icon="pi pi-trash" class="p-button-rounded p-button-text" style="color: red;"
                            v-if="data.comment !== 'Default rule'"
                        ></Button>
                    </template>
                </Column>

                </DataTable>

                <Button @click="addBasicRule(ruleset.rules)" class="add-rule-btn">
                    <i class="pi pi-plus"></i>
                </Button>
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
                            <div class="row">
                                <!-- make the border red if access is restricted and the ips are empty -->
                                <div class="tags-container add-border" :style="{ 'border-color': data.access === 'restricted' && data.allowedIps.length === 0 ? 'red' : '#ccc' }">
                                    <div v-for="ip in data.allowedIps" style="margin: 6px;">
                                        <Tag severity="secondary">{{ ip }}
                                            <i class="pi pi-times-circle" style="cursor: pointer;" @click="deleteIpItem(data.allowedIps, ip)"
                                                v-if="data.access === 'restricted'"
                                            ></i>
                                        </Tag>
                                    </div>
                                </div>
                            
                                <Button @click="showAddIpPopover($event, data.allowedIps)" icon="pi pi-plus" class="p-button-rounded p-button-text"
                                        :disabled="data.access !== 'restricted'" style="justify-self: flex-end !important; margin-left: 15px;"
                                ></Button>
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>




            <div class="col center" style="margin-top: 40px;">
                <h2>L7 Rules</h2>
                <DataTable :value="l7rules" style="width: 100%;" editMode="row"
                @row-edit-save="(event) => onRowEditSave(event, l7rules)" v-model:editingRows="editingRowsL7" dataKey="id"
                @row-edit-cancel="(event) => onRowEditCancel(event, l7rules)"
                :pt="{
                        table: { style: 'min-width: 50rem' }
                    }"
                >
                    <Column field="policy" header="Policy"></Column>
                    <Column field="type" header="Type">
                        <template #body="{ data }">
                            <span v-if="data.categoryId === 'host'">
                                HTTP Hostname
                            </span>
                            <span v-if="data.categoryId === 'port'">
                                Port
                            </span>
                            <span v-if="data.categoryId === 'ipRange'">
                                Remote IP Range and optionnal port
                            </span>
                            <span v-if="[ 'host', 'ipRange', 'port' ].indexOf(data.categoryId) === -1">
                                <!-- else the type is an application, we need to display its name by finding the category which the data.value.id belongs to -->
                                {{ applications.find(app => app.items.find((item: any) => item.id == data.objValue.id)).name }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <Select v-model="data.categoryId" :options="applications" optionLabel="name" optionValue="categoryId" placeholder="select an application"
                                @change="console.log('Selected category', data.categoryId, 'current data', data); data.value = data.categoryId === 'port' ? 1 : data.value"
                            ></Select>
                        </template>
                    </Column>
                    <Column field="value" header="Value">
                        <template #body="{ data }">
                            <span v-if="[ 'host', 'ipRange', 'port' ].indexOf(data.categoryId) !== -1">
                                {{ data.value }}
                            </span>
                            <span v-else>
                                <!-- else the value is an object and we need to display the name -->
                                {{ data.objValue.name }}
                            </span>
                        </template>
                        <template #editor="{ data, field }">
                            <InputText v-if="data.categoryId === 'host' || data.categoryId === 'ipRange'" v-model="data.value" style="width: 80%"/>
                            <InputNumber v-if="data.categoryId === 'port'" v-model="data.value" mode="decimal" style="width: 80%"/>
                            <Select v-if="[ 'host', 'ipRange', 'port' ].indexOf(data.categoryId) === -1"
                                v-model="data.objValue" :options="applications.find(app => app.categoryId === data.categoryId).items"
                                optionLabel="name" placeholder="select an application"
                                @change="console.log('Selected application', data.objValue)"
                            ></Select>
                        </template>
                    </Column>
                    <Column :row-editor="true" style="width: 8%"></Column>
                    <Column>
                        <template #body="{ data }">
                            <Button @click="deleteRow(l7rules, data.id)" icon="pi pi-trash" class="p-button-rounded p-button-text" style="color: red;"></Button>
                        </template>
                    </Column>
                </DataTable>
                <Button @click="addL7Rule" class="add-rule-btn">
                    <i class="pi pi-plus"></i>
                </Button>
            </div>

        </div>
        <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
        <div class="col center" style="margin-top: 40px; margin-bottom: 60px;" v-if="!loadingConf">
            <Button @click="confirmChanges" :disabled="saving" class="constant-width-150 constant-height-40">
                <v-progress-circular v-if="saving" indeterminate color="white"></v-progress-circular>
                <span v-else>Save on Meraki</span>
            </Button>
            <div class="row center" style="margin-top: 20px;">
                <Button @click="back" style="margin-right: 15px;">Back</Button>
                <Button @click="nextPage" :disabled="!thisState">Next</Button>
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
                    <div class="margin" v-if="groupEditable">
                        <TieredMenu :model="objectsMenu"></TieredMenu>
                    </div>

                    <!-- add cidr input -->
                    <div class="margin row" v-if="cidrEditable">
                        <InputText v-model="newCidrInput" placeholder="Add a CIDR" style="margin-right: 20px;"/>
                        <button @click="addCidrToRule()">Add</button>
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
    .active {
        background-color: #007bff;
        color: white;
    }

    .margin {
        margin-top: 10px;
    }

    .group-tag {
        color: white;
        background-color: var(--p-tag-primary-color);
    }

    .tags-container {
        display: flex;
        flex-wrap: wrap;
        min-width: 60%;
    }

    .add-border {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 5px;
        min-height: 60px;
    }

    .add-rule-btn {
        background-color: #ffffff;
        color: #333;
        border: 1px solid #ccc;

        margin-top: 8px;
    }
</style>