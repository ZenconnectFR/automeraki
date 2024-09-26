<script>
/**
 * Parses a text containing 0 or more device serials into a list of serials.
 * Serails are like QXXX-XXXX-XXXX or QXXX=XXXX=XXXX (because the scanner replaces dashes with equals)
 * @param {string} text - The text to parse
 * @returns {string[]} - The list of serials found in the text
 */
export function parseDevices(text) {
    // Match serials like QXXX-XXXX-XXXX or QXXX=XXXX=XXXX
    let serials = text.match(/Q[0-9A-Z]{3}[-=][0-9A-Z]{4}[-=][0-9A-Z]{4}/g);
    // replace = with - in serials
    serials = serials ? serials.map(serial => serial.replace('=', '-')) : [];
    return serials ? serials : [];
};

/**
 * Create placeholder mac address for devices which we don't have the mac address. Creates a mac address with another mac incremented by 1
 * @param {string} mac - Default: "00:00:00:00:00:00"
 * @returns {string} - The new mac address
 */

export function createMac(mac="00:00:00:00:00:00") {
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

</script>

