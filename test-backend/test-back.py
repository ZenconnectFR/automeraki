from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import meraki
import os
from dotenv import load_dotenv

# Load the environment variables
load_dotenv()

# Get the API key from the environment
api_key = os.getenv("API_KEY")

# Initialize the Dashboard API
dashboard = meraki.DashboardAPI(api_key, output_log=False)

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
        if network["id"] != "L_738027388935340791":
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
        processed_networks.append({"id": network["id"], "name": network["name"]})

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
    network = dashboard.networks.getNetwork(network_id)

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
    updated_device = dashboard.devices.updateDevice(serial, address=address)

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
