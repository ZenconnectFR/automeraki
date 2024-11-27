export function parseDevices(text: string): string[] {
    // Match serials like QXXX-XXXX-XXXX or QXXX=XXXX=XXXX
    let serials = text.match(/Q[0-9A-Z]{3}[-=][0-9A-Z]{4}[-=][0-9A-Z]{4}/g) as string[] | null;
    // replace = with - in serials
    serials = serials ? serials.map(serial => serial.replaceAll('=', '-')) : [];
    return serials ? serials : [];
};


export function createMac(mac: string="00:00:00:00:00:00"): string {
    // check input is a mac address
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

    if (!macRegex.test(mac)) {
        console.error('[MISC] Invalid mac address: ', mac)
        return "00:00:00:00:00:00"
    }

    // convert to integer
    let macInt = mac.split(':').map(part => parseInt(part, 16))

    // increment by 1
    for (let i = macInt.length - 1; i >= 0; i--) {
        macInt[i]++
        if (macInt[i] <= 255) {
            break;
        } else {
            macInt[i] = 0
        }
    }

    // convert back to hex
    const newMac = macInt.map(part => part.toString(16).padStart(2, '0')).join(':');

    return newMac;
}

// error parsing
/*
example error : updateNetworkApplianceFirewallInboundFirewallRules - 400 Bad Request,
{'errors': 
    [
        'At least one of your firewall rules is invalid: "network[firewall_rules][1][src_cidr] Source address must be an IPv6 address or a subnet in CIDR form (e.g. \'2001:db8::/64\'), a VLAN address using the VLAN ID (e.g. VLAN(10).*, VLAN(10).8) or \'any\'".'
    ]
}

should turn into : 
At least one of your firewall rules is invalid: "network[firewall_rules][1][src_cidr] Source address must be an IPv6 address or a subnet in CIDR form (e.g. '2001:db8::/64'), a VLAN address using the VLAN ID (e.g. VLAN(10).*, VLAN(10).8) or 'any'".

Warning: the example contains the entire error message, but the function should only return the error message, not the entire error object.
*/

export function parseError(error: any): string {
    let res = ''
    // extract the list of errors from the error object (match using regex
    let errorObj = error.match(/\[(.*)\]/)
    if (errorObj) {
        res = ' - ' + errorObj[1]
    }
    return res;
}