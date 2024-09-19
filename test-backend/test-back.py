from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import meraki
import os

# to be put in env later on
API_KEY = "43e06b052b458db15f5a74ccd556f67de74d823c"

# Initialize the Dashboard API
dashboard = meraki.DashboardAPI(API_KEY)


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


@app.get("/networks/{org_id}")
def get_networks(org_id: str):
    networks = dashboard.organizations.getOrganizationNetworks(org_id, total_pages='all')

    # process the data to send back only the network names and ids
    processed_networks = []
    for network in networks:
        processed_networks.append({"id": network["id"], "name": network["name"]})

    return processed_networks

