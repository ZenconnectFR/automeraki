import EditNetwork from "@/pages/editNetwork.vue"

export const routeTable = {
    editNetwork: {
        label: "Edit Network",
        path: "/edit-network",
    },
    claim: {
        label: "Claim",
        path: "/claim"
    },
    naming: {
        label: "Naming",
        path: "/naming"
    },
    fixedIp: {
        label: "Fixed IP",
        path: "/fixed-ip"
    },
    vlan: {
        label: "VLAN",
        path: "/vlan"
    },
    ports: {
        label: "Ports",
        path: "/ports"
    },
    firewall: {
        label: "Firewall",
        path: "/firewall"
    },
    wans: {
        label: "WANs",
        path: "/wans"
    },
    vpn: {
        label: "VPN",
        path: "/voice-and-spoke"
    },
    tags: {
        label: "Tags",
        path: "/tag-network"
    },
    misc: {
        label: "Misc",
        path: "/misc"
    },
    complete: {
        label: "End",
        path: "/complete"
    },
    eof: {
        label: "End",
        path: "/complete"
    }
}

export function getRoutePath(route: string) {
    return routeTable[route].path
}

export function getPageLabel(route: string) {
    return routeTable[route].label
}