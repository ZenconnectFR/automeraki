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
