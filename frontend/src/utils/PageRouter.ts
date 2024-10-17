const routeTable = {
    naming: "/naming",
    fixedIp: "/fixed-ip",
    vlan: "/vlan",
    ports: "/ports",
    firewall: "/firewall",
    wans: "/wans",
    vpn: "/voice-and-spoke",
    tags: "/tag-network",
    eof: "/complete"
}

export function getRoutePath(route: string) {
    return routeTable[route];
}