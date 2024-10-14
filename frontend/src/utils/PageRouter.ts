const routeTable = {
    naming: "/naming",
    fixedIp: "/fixed-ip",
    vlan: "/vlan",
    ports: "/ports",
    wans: "/wans",
    vpn: "/voice-and-spoke",
    tags: "/tag-network",
}

export function getRoutePath(route: string) {
    return routeTable[route];
}