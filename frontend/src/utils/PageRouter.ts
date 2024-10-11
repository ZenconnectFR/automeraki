const routeTable = {
    naming: "/naming",
    fixedIp: "/fixed-ip",
    vlan: "/vlan",
    ports: "/ports",
    wans: "/wans",
    vpn: "/voice-and-spoke"
}

export function getRoutePath(route: string) {
    return routeTable[route];
}