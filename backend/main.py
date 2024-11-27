from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import meraki
import os
import json
from dotenv import load_dotenv

# Load the environment variables
load_dotenv()

# Get the API key from the environment
api_key = os.getenv("API_KEY")

# Initialize the Dashboard API
dashboard = meraki.DashboardAPI(api_key, output_log=False, wait_on_rate_limit=True)

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://fgdgdphbledbaobgnoipggfohfaknjem", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------ GET ------------------

# Test route
@app.get("/")
def read_root():
    return {"Hello": "World"}


# ---------

# delete new test networks (ie. all networks with id different from : L_738027388935340791)
@app.get("/del_test_networks")
def del_test_networks():
    networks = dashboard.organizations.getOrganizationNetworks("738027388935340172", total_pages='all')
    for network in networks:
        if network["id"] != "L_738027388935340791" and network["id"] != "N_738027388935362105":
            dashboard.networks.deleteNetwork(network["id"])

    return {"Networks": "Deleted"}


# ---------

# Get all organizations
@app.get("/organizations")
def get_organizations():
    organizations = dashboard.organizations.getOrganizations()

    # process the data to send back only the organization names and ids
    processed_organizations = []
    for org in organizations:
        processed_organizations.append({"id": org["id"], "name": org["name"]})

    return processed_organizations


# ---------

# Get all networks in an organization
@app.get("/organizations/{org_id}/networks")
def get_networks(org_id: str):
    networks = dashboard.organizations.getOrganizationNetworks(org_id, total_pages='all')

    # process the data to send back only the network names and ids
    processed_networks = []
    for network in networks:
        processed_networks.append({"value": network["id"], "name": network["name"]})

    return processed_networks



# ---------

# Get all devices in a network
@app.get("/networks/{network_id}/devices")
def get_devices(network_id: str):
    devices = dashboard.networks.getNetworkDevices(network_id)

    return devices

# ---------

# Get one network
@app.get("/networks/{network_id}")
def get_network(network_id: str):
    try:
        network = dashboard.networks.getNetwork(network_id)
    except Exception as e:
        return {"error": str(e)}

    return network


# ---------

# Get one device
@app.get("/devices/{serial}")
def get_device(serial: str):
    device = dashboard.devices.getDevice(serial)

    return device


# ---------

class GetInventory(BaseModel):
    org_id: str
    serials: Optional[list[str]] = None

@app.post("/organizations/inventory")
def get_inventory(inventory: GetInventory):
    org_id = inventory.org_id
    serials = inventory.serials

    devices = dashboard.organizations.getOrganizationInventoryDevices(org_id, total_pages='all', serials=serials)

    return devices


# ---------
'''
Get one device in the inventory of an organization
path: /organization/{org_id}/inventory/{serial}
method: GET
'''
@app.get("/organizations/{org_id}/inventory/{serial}")
def get_inventory_device(org_id: str, serial: str):
    device = dashboard.organizations.getOrganizationInventoryDevice(org_id, serial)

    return device

# ---------
'''
get vlans in a network
'''
@app.get("/networks/{network_id}/vlans")
def get_vlans(network_id: str):
    vlans = dashboard.appliance.getNetworkApplianceVlans(network_id)

    return vlans


# ---------

#blink device
@app.get("/devices/{serial}/blink")
def blink_device(serial: str):
    try:
        blink = dashboard.devices.blinkDeviceLeds(serial)
    except Exception as e:
        return {"error": str(e)}
    return blink


# ---------

# Get the ports of a device with serial
@app.get("/devices/{serial}/ports")
def get_ports(serial: str):
    ports = dashboard.switch.getDeviceSwitchPorts(serial)

    return ports


# ---------

# Get an action batch
@app.get("/organizations/{org_id}/actionBatches/{actionBatchId}")
def get_action_batch(org_id: str, actionBatchId: str):
    action_batch = dashboard.organizations.getOrganizationActionBatch(org_id, actionBatchId)

    return action_batch


# ---------

# Get all the firewall rules for a network (l3 in, l3 out, l7, cellular in, cellular out, wan services, port forwarding, 1:1 nat, 1:many nat)
@app.get("/networks/{network_id}/firewallRules")
def get_firewall_rules(network_id: str):
        
    inboundFirewallRules = dashboard.appliance.getNetworkApplianceFirewallInboundFirewallRules(network_id)
    print('\nInbound Firewall Rules:\n' + str(inboundFirewallRules) + '\n')
    l3FirewallRules = dashboard.appliance.getNetworkApplianceFirewallL3FirewallRules(network_id)
    print('\nL3 Firewall Rules:\n' + str(l3FirewallRules) + '\n')
    cellularFailoverRules = dashboard.appliance.getNetworkApplianceFirewallCellularFirewallRules(network_id)
    print('\nCellular Failover Rules:\n' + str(cellularFailoverRules) + '\n')
    inboundCellularFirewallRules = dashboard.appliance.getNetworkApplianceFirewallInboundCellularFirewallRules(network_id)
    print('\nInbound Cellular Firewall Rules:\n' + str(inboundCellularFirewallRules) + '\n')
    wanApplianceServices = dashboard.appliance.getNetworkApplianceFirewallFirewalledServices(network_id)
    print('\nWAN Appliance Services:\n' + str(wanApplianceServices) + '\n')
    l7FirewallRules = dashboard.appliance.getNetworkApplianceFirewallL7FirewallRules(network_id)
    print('\nL7 Firewall Rules:\n' + str(l7FirewallRules) + '\n')
    portForwardingRules = dashboard.appliance.getNetworkApplianceFirewallPortForwardingRules(network_id)
    print('\nPort Forwarding Rules:\n' + str(portForwardingRules) + '\n')
    oneToOneNatRules = dashboard.appliance.getNetworkApplianceFirewallOneToOneNatRules(network_id)
    print('\nOne to One NAT Rules:\n' + str(oneToOneNatRules) + '\n')
    oneToManyNatRules = dashboard.appliance.getNetworkApplianceFirewallOneToManyNatRules(network_id)
    print('\nOne to Many NAT Rules:\n' + str(oneToManyNatRules) + '\n')

    return { "inboundFirewallRules": inboundFirewallRules,
            "l3FirewallRules": l3FirewallRules,
            "cellularFailoverRules": cellularFailoverRules,
            "inboundCellularFirewallRules": inboundCellularFirewallRules,
            "wanApplianceServices": wanApplianceServices,
            "l7FirewallRules": l7FirewallRules,
            "portForwardingRules": portForwardingRules,
            "oneToOneNatRules": oneToOneNatRules,
            "oneToManyNatRules": oneToManyNatRules}


# ---------

# get policy objects for an organization
@app.get("/organizations/{org_id}/policyObjects")
def get_policy_objects(org_id: str):
    policy_objects = dashboard.organizations.getOrganizationPolicyObjects(org_id, total_pages='all')

    group_objects = dashboard.organizations.getOrganizationPolicyObjectsGroups(org_id, total_pages='all')

    res = []
    for p_obj in policy_objects:
        res.append({ "id": p_obj["id"], "name": p_obj["name"]})

    for g_obj in group_objects:
        res.append({ "id": g_obj["id"], "name": g_obj["name"]})


    print('\nPolicy Objects:\n' + str(res) + '\n')

    return res


# ---------

# get mx settings for a network
@app.get("/getMxSettings/{network_id}")
def get_mx_settings(network_id: str):
    mx_settings = dashboard.appliance.getNetworkApplianceSettings(network_id)

    return mx_settings


# ---------

# get device management interface
@app.get("/devices/{serial}/managementInterface")
def get_management_interface(serial: str):
    management_interface = dashboard.devices.getDeviceManagementInterface(serial)

    return management_interface


# ---------

# get a network's ssids
@app.get("/networks/{network_id}/ssids")
def get_ssids(network_id: str):
    ssids = dashboard.wireless.getNetworkWirelessSsids(network_id)

    return ssids




























# MARK: - POST

# ------------------ POST ------------------

class CloneNetwork(BaseModel):
    network_id: str
    name: str
    org_id: str

'''
Clone from an existing network
path: /network/{org_id}/clone
method: POST
body: {"network_id": "L_XXXXX...", "name": "New Network Name"}
'''
@app.post("/networks/clone")
def clone_network(clone_network: CloneNetwork):
    print(clone_network)
    network_id = clone_network.network_id
    name = clone_network.name
    product_types = ['appliance', 'switch', 'wireless']
    org_id = clone_network.org_id

    # clone the network
    new_network = dashboard.organizations.createOrganizationNetwork(org_id, name, product_types, copyFromNetworkId=network_id)

    return new_network

# ----------

class ClaimDevices(BaseModel):
    network_id: str
    serials: list[str]

'''
Add devices to a network
path: /network/{network_id}/claim
method: POST
body: {"serials": ["Q2MN-XXXX-XXXX", "Q2MN-XXXX-XXXX"]}
'''
@app.post("/networks/claim")
async def claim_devices(claim_devices: ClaimDevices):
    serials = claim_devices.serials
    network_id = claim_devices.network_id

    # claim the devices

    try:
        claimed_devices = dashboard.networks.claimNetworkDevices(network_id, serials)
    except Exception as e:
        return {"error": str(e)}

    return claimed_devices



    #for testing, just send back a response with the serials
    #return {"serials": serials, "network_id": network_id}


# ----------

class DeviceAddress(BaseModel):
    address: str
    serial: str

'''
Change the address of a device
path: /devices/address
method: POST
body: {"address": "123 Main St", "serial": "QXXX-XXXX-XXXX"}
'''
@app.post("/devices/address")
def change_address(network_address: DeviceAddress):
    address = network_address.address
    serial = network_address.serial

    # change the address
    updated_device = dashboard.devices.updateDevice(serial, address=address, moveMapMarker=True)

    return updated_device


# ----------

class DeviceName(BaseModel):
    name: str
    serial: str

@app.post("/devices/name")
def change_name(network_name: DeviceName):
    name = network_name.name
    serial = network_name.serial

    # change the name
    updated_device = dashboard.devices.updateDevice(serial, name=name)

    return updated_device


# ----------

class DeviceNetwork(BaseModel):
    network_id: str
    serial: str

@app.post("/networks/removeDevice")
def remove_device(network_device: DeviceNetwork):
    network_id = network_device.network_id
    serial = network_device.serial

    # remove the device
    removed_device = dashboard.networks.removeNetworkDevices(network_id, serial=serial)

    return removed_device


# ----------

class CreateVlan(BaseModel):
    network_id: str
    id: int
    name: str
    applianceIp: str
    subnet: str

@app.post("/networks/createVlan")
def create_vlan(create_vlan: CreateVlan):
    network_id = create_vlan.network_id
    id_ = create_vlan.id
    name = create_vlan.name
    applianceIp = create_vlan.applianceIp
    subnet = create_vlan.subnet


    # create the vlan
    new_vlan = dashboard.appliance.createNetworkApplianceVlan(network_id, id_, name, applianceIp=applianceIp, subnet=subnet)

    return new_vlan


# ----------

class CreateActionBatch(BaseModel):
    orgId : str
    actions: list[Any]

@app.post("/startActionBatch")
def start_action_batch(create_action_batch: CreateActionBatch):
    orgId = create_action_batch.orgId
    actions = create_action_batch.actions

    print('\nActions:\n' + str(actions) + '\n')
    print('\nOrg ID:\n' + str(orgId) + '\n')

    # create the action batch
    action_batch = dashboard.organizations.createOrganizationActionBatch(orgId, actions, confirmed=True, synchronous=False)

    return action_batch

class UpdateMTUSize(BaseModel):
    networkId: str
    mtu: int

@app.post("/networks/updateMTUSize")
def update_mtu_size(update_mtu_size: UpdateMTUSize):
    networkId = update_mtu_size.networkId
    mtu = update_mtu_size.mtu

    # update the MTU size
    updated_network = dashboard.switch.updateNetworkSwitchMtu(networkId, defaultMtuSize=mtu)

    return updated_network


# ----------

class UpdateWans(BaseModel):
    serial: str
    wan1: Optional[dict] = None
    wan2: Optional[dict] = None

@app.post("/devices/updateWans")
def update_wans(update_wans: UpdateWans):
    serial = update_wans.serial
    wan1 = update_wans.wan1
    wan2 = update_wans.wan2

    try:
        updated_device = dashboard.devices.updateDeviceManagementInterface(serial, wan1=wan1, wan2=wan2)
    except Exception as e:
        return {"error": str(e)}

    return updated_device


# ----------

#get site to site vpn
@app.get("/networks/{network_id}/siteToSiteVpn")
def get_site_to_site_vpn(network_id: str):
    site_to_site_vpn = dashboard.appliance.getNetworkApplianceVpnSiteToSiteVpn(network_id)

    return site_to_site_vpn


# ----------

#get vlans for a network
@app.get("/networks/{network_id}/vlans")
def get_vlans(network_id: str):
    vlans = dashboard.appliance.getNetworkApplianceVlans(network_id)

    return vlans


# ----------

#get vlans settings for a network
@app.get("/networks/{networkId}/vlanSettings")
def get_vlan_settings(networkId: str):
    vlan_settings = dashboard.appliance.getNetworkApplianceVlansSettings(networkId)

    return vlan_settings


# ----------

# get vpn statuses for an organization
@app.get("/organizations/{org_id}/vpnStatuses")
def get_vpn_statuses(org_id: str):
    try:
        vpn_statuses = dashboard.appliance.getOrganizationApplianceVpnStatuses(org_id, total_pages='all')
    except Exception as e:
        return {"error": str(e)}

    return vpn_statuses


# ----------

# get splash page settings for a network
@app.get("/networks/{network_id}/splashPageSettings")
def get_splash_page_settings(network_id: str):
    # 1 - get the list of ssids for the network
    ssids = dashboard.wireless.getNetworkWirelessSsids(network_id)

    # 2 - get the splash page settings for each ssid that: is enabled and has a splashPage != "None"
    splash_page_settings = []
    for ssid in ssids:
        if ssid["enabled"] and ssid["splashPage"] != "None":
            splash_page_settings.append(dashboard.wireless.getNetworkWirelessSsidSplashSettings(network_id, ssid["number"]))

    return splash_page_settings



















# MARK: - PUT

# ------------------ PUT ------------------

class UpdateNetworkVlan(BaseModel):
    network_id: str
    # options is an array of dictionaries
    options: list[Any]


@app.put("/networks/updateNetworkVlan")
def update_network_vlan(update_network_vlan: UpdateNetworkVlan):
    network_id = update_network_vlan.network_id
    options = update_network_vlan.options

    response = []

    for option in options:
        vlan_id = option["id"]
        payload = option["payload"] # list of dictionaries

        print('\nPayload:\n' + str(payload) + '\n')

        #payloadResponse = []

        for item in payload:
            # turn item into kwargs

            print('\nItem:\n' + str(item) + '\n')

            kwargs = {}
            if item:
                kwargs.update(item)

            print('\nkwargs:\n' + str(kwargs) + '\n')

            try:
                updated_vlan = dashboard.appliance.updateNetworkApplianceVlan(network_id, vlan_id, **kwargs)
                response.append(updated_vlan)
            except Exception as e:
                return {"error": str(e)}


            #payloadResponse.append("Updated VLAN " + str(vlan_id) + " with " + str(kwargs))

        #response.append(payloadResponse)

    return response


# ----------

# enableVlans
@app.put("/networks/enableVlans/{network_id}")
def enable_vlans(network_id: str):
    try:
        enabled_vlans = dashboard.appliance.updateNetworkApplianceVlansSettings(network_id, vlansEnabled=True)
    except Exception as e:
        return {"error": str(e)}

    return enabled_vlans


# ----------

# disableVlans
@app.put("/networks/disableVlans/{network_id}")
def disable_vlans(network_id: str):
    try:
        disabled_vlans = dashboard.appliance.updateNetworkApplianceVlansSettings(network_id, vlansEnabled=False)
    except Exception as e:
        return {"error": str(e)}

    return disabled_vlans


# ----------

# update stp settings

class UpdateSTPSettings(BaseModel):
    network_id: str
    rstpEnabled: bool
    stpBridgePriority: list[Any]

@app.put("/networks/updateSTPSettings")
def update_stp_settings(update_stp_settings: UpdateSTPSettings):
    network_id = update_stp_settings.network_id
    rstpEnabled = update_stp_settings.rstpEnabled
    stpBridgePriority = update_stp_settings.stpBridgePriority

    try:
        updated_stp_settings = dashboard.switch.updateNetworkSwitchStp(network_id, rstpEnabled=rstpEnabled, stpBridgePriority=stpBridgePriority)
    except Exception as e:
        return {"error": str(e)}

    return updated_stp_settings


# ----------

# update device info
class UpdateDeviceTags(BaseModel):
    serial: str
    tags: list[str]

@app.put("/devices/updateTags")
def update_device_tags(update_device_tags: UpdateDeviceTags):
    serial = update_device_tags.serial
    tags = update_device_tags.tags

    try:
        updated_device = dashboard.devices.updateDevice(serial, tags=tags)
    except Exception as e:
        return {"error": str(e)}

    return updated_device


# ----------

# update network info
class UpdateNetwork(BaseModel):
    networkId: str
    payload: Optional[dict] = None

@app.put("/networks/update")
def update_network(update_network: UpdateNetwork):
    network_id = update_network.networkId
    payload = update_network.payload

    print('\nPayload:\n' + str(payload) + '\n')

    try:
        updated_network = dashboard.networks.updateNetwork(network_id, **payload)
    except Exception as e:
        return {"error": str(e)}

    return updated_network


# ----------

# update firewall rules

class UpdateFirewallRules(BaseModel):
    network_id: str
    payload: Optional[dict] = None

@app.put("/networks/firewallRules/update")
def update_firewall_rules(update_firewall_rules: UpdateFirewallRules):
    network_id = update_firewall_rules.network_id
    payload = update_firewall_rules.payload

    #print('\nPayload:\n' + str(payload) + '\n')

    res = {}

    if not payload:
        return {"error": "No payload provided"}
    
    if "inboundFirewallRules" in payload:
        try:
            print('\nInbound Firewall Rules:\n' + str(payload["inboundFirewallRules"]['rules']) + '\n')
            updated_inbound_firewall_rules = dashboard.appliance.updateNetworkApplianceFirewallInboundFirewallRules(network_id, rules=payload["inboundFirewallRules"]["rules"])
            res["inboundFirewallRules"] = updated_inbound_firewall_rules
        except Exception as e:
            print('\nError:\n' + str(e) + '\n')
            return {"error": str(e)}
    
    if "l3FirewallRules" in payload:
        try:
            updated_l3_firewall_rules = dashboard.appliance.updateNetworkApplianceFirewallL3FirewallRules(network_id, rules=payload["l3FirewallRules"]['rules'])
            res["l3FirewallRules"] = updated_l3_firewall_rules
        except Exception as e:
            return {"error": str(e)}
        
    if "cellularFailoverRules" in payload:
        try:
            updated_cellular_failover_rules = dashboard.appliance.updateNetworkApplianceFirewallCellularFirewallRules(network_id, rules=payload["cellularFailoverRules"]['rules'])
            res["cellularFailoverRules"] = updated_cellular_failover_rules
        except Exception as e:
            return {"error": str(e)}
    
    if "inboundCellularFirewallRules" in payload:
        try:
            updated_inbound_cellular_firewall_rules = dashboard.appliance.updateNetworkApplianceFirewallInboundCellularFirewallRules(network_id, rules=payload["inboundCellularFirewallRules"]['rules'])
            res["inboundCellularFirewallRules"] = updated_inbound_cellular_firewall_rules
        except Exception as e:
            return {"error": str(e)}
        
    if "wanApplianceServices" in payload:
        try:
            updated_wan_appliance_services = []
            for service in payload["wanApplianceServices"]:
                updated_wan_appliance_services.append(dashboard.appliance.updateNetworkApplianceFirewallFirewalledService(network_id, **service))
            res["wanApplianceServices"] = updated_wan_appliance_services
        except Exception as e:
            return {"error": str(e)}
    
    if "l7FirewallRules" in payload:
        try:
            updated_l7_firewall_rules = dashboard.appliance.updateNetworkApplianceFirewallL7FirewallRules(network_id, rules=payload["l7FirewallRules"]["rules"])
            res["l7FirewallRules"] = updated_l7_firewall_rules
        except Exception as e:
            return {"error": str(e)}
    
    if "portForwardingRules" in payload:
        try:
            updated_port_forwarding_rules = dashboard.appliance.updateNetworkApplianceFirewallPortForwardingRules(network_id, rules=payload["portForwardingRules"]["rules"])
            res["portForwardingRules"] = updated_port_forwarding_rules
        except Exception as e:
            return {"error": str(e)}
    
    if "oneToOneNatRules" in payload:
        try:
            updated_one_to_one_nat_rules = dashboard.appliance.updateNetworkApplianceFirewallOneToOneNatRules(network_id, rules=payload["oneToOneNatRules"]["rules"])
            res["oneToOneNatRules"] = updated_one_to_one_nat_rules
        except Exception as e:
            return {"error": str(e)}
    
    if "oneToManyNatRules" in payload:
        try:
            updated_one_to_many_nat_rules = dashboard.appliance.updateNetworkApplianceFirewallOneToManyNatRules(network_id, payload["oneToManyNatRules"]["rules"])
            res["oneToManyNatRules"] = updated_one_to_many_nat_rules
        except Exception as e:
            return {"error": str(e)}
        
    return res


# ----------

# update site to site vpn
class UpdateSiteToSiteVpn(BaseModel):
    network_id: str
    payload: Optional[dict] = None

@app.put("/networks/siteToSiteVpn/update")
def update_site_to_site_vpn(update_site_to_site_vpn: UpdateSiteToSiteVpn):
    network_id = update_site_to_site_vpn.network_id
    payload = update_site_to_site_vpn.payload

    try:
        updated_site_to_site_vpn = dashboard.appliance.updateNetworkApplianceVpnSiteToSiteVpn(network_id, **payload)
    except Exception as e:
        return {"error": str(e)}

    return updated_site_to_site_vpn


# ----------

# update splash page settings
class UpdateSplashPageSettings(BaseModel):
    network_id: str
    payload: Optional[dict] = None

@app.put("/networks/splashPageSettings/update")
def update_splash_page_settings(update_splash_page_settings: UpdateSplashPageSettings):
    network_id = update_splash_page_settings.network_id
    payload = update_splash_page_settings.payload

    number = payload["ssidNumber"]
    # remove the number from the payload
    del payload['ssidNumber']

    try:
        updated_splash_page_settings = dashboard.wireless.updateNetworkWirelessSsidSplashSettings(network_id, number, **payload)
    except Exception as e:
        return {"error": str(e)}

    return updated_splash_page_settings


# ----------

# update device notes
class UpdateDeviceNotes(BaseModel):
    serial: str
    notes: str

@app.put("/devices/updateNotes")
def update_device_notes(update_device_notes: UpdateDeviceNotes):
    serial = update_device_notes.serial
    notes = update_device_notes.notes

    try:
        updated_device = dashboard.devices.updateDevice(serial, notes=notes)
    except Exception as e:
        return {"error": str(e)}

    return updated_device


# ----------

# update mx settings
class UpdateMXSettings(BaseModel):
    network_id: str
    payload: Optional[dict] = None

@app.put("/updateMxSettings")
def update_mx_settings(update_mx_settings: UpdateMXSettings):
    network_id = update_mx_settings.network_id
    payload = update_mx_settings.payload

    try:
        updated_mx_settings = dashboard.appliance.updateNetworkApplianceSettings(network_id, **payload)
    except Exception as e:
        return {"error": str(e)}

    return updated_mx_settings
    
    

















# MARK: - TEMPLATES

'''
------------------------------ TEMPLATES ------------------------------

Templates are a way to save configurations and apply them to a new network.
They are stored in ./configurations/{org_id}/{template_id}.json
'''

# ------------------ GET ------------------


# Get the list of templates in an organization, we return the template name and id
@app.get("/organizations/{org_id}/templates")
def get_templates(org_id: str):
    templates = []

    # get the list of templates from the folder ./configurations/{org_id}
    # add them to the templates list as {name: "template["name"], value: "{file name}"}
    folder_path = f"./configurations/{org_id}"

    # if the folder doesn't exist, return an empty list
    if not os.path.exists(folder_path):
        return []

    for file in os.listdir(folder_path):
        if file.endswith(".json"):
            with open(f"{folder_path}/{file}", "r") as f:
                template = json.load(f)
                templates.append({"name": template["name"], "value": f"{file}"})

    # if there isn't a list of templates, return an empty list
    if not templates:
        return []

    return templates


# ---------

# Get a template from its path, returns the entire payload
@app.get("/organizations/{org_id}/templates/{template_id}")
def get_template(org_id: str, template_id: str):

    if not os.path.exists(f"./configurations/{org_id}/{template_id}"):
        return {"error": "Template not found"}

    with open(f"./configurations/{org_id}/{template_id}", "r") as f:
        template = json.load(f)

    return template


# ------------------ POST ------------------

# Create a new template
# TODO: create a new template (we'll see when we get to it)
