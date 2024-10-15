const routeTable = {
    naming: "/naming",
    fixedIp: "/fixed-ip",
    vlan: "/vlan",
    ports: "/ports",
    firewall: "/next",
    wans: "/wans",
    vpn: "/voice-and-spoke",
    tags: "/tag-network",
    eof: "/complete"
}

export function getRoutePath(route: string) {
    return routeTable[route];
}