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
</script>

