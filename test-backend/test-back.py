from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/del_logs")
def del_logs():
    # delete meraki_api_log* files
    os.system("rm meraki_api__log*")
    return {"Logs": "Deleted"}

# delete new test networks (ie. all networks with id different from : L_738027388935340791)
@app.get("/del_test_networks")
def del_test_networks():
    networks = dashboard.organizations.getOrganizationNetworks("738027388935340172", total_pages='all')
    for network in networks:
        if network["id"] != "L_738027388935340791":
            dashboard.networks.deleteNetwork(network["id"])
    return {"Networks": "Deleted"}


# Get all organizations
@app.get("/organizations")
def get_organizations():
    organizations = dashboard.organizations.getOrganizations()

    # process the data to send back only the organization names and ids
    processed_organizations = []
    for org in organizations:
        processed_organizations.append({"id": org["id"], "name": org["name"]})

    return processed_organizations

@app.get("/networks/{org_id}")
def get_networks(org_id: str):
    networks = dashboard.organizations.getOrganizationNetworks(org_id, total_pages='all')

    # process the data to send back only the network names and ids
    processed_networks = []
    for network in networks:
        processed_networks.append({"id": network["id"], "name": network["name"]})

    return processed_networks


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
def claim_devices(claim_devices: ClaimDevices):
    serials = claim_devices.serials
    network_id = claim_devices.network_id

    '''
    # claim the devices
    claimed_devices = dashboard.networks.claimNetworkDevices(network_id, serials)

    return claimed_devices
    '''

    #for testing, just send back a response with the serials
    return {"serials": serials, "network_id": network_id}


class NetworkAddress(BaseModel):
    address: str

'''
'''


