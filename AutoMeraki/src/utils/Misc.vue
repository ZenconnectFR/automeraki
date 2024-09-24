<script>
import { getInventoryDevices } from '../endpoints/organization/getInvetoryDevices.vue';

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
 * Checks if a device is in the organization inventory
 * @param {string} serial - The serial of the device to check
 * @returns {boolean} - True if the device is in the inventory, false otherwise
 */

export async function checkDeviceInInventory(serial, orgId) {
    console.log('[MISC] Checking device in inventory: ', serial)
    let inventoryDevices = await getInventoryDevices(orgId);

    // check if the serial is in the inventory
    console.log('[MISC] Inventory devices: ', inventoryDevices)
    for (const invDevice of inventoryDevices) {
        console.log('[MISC] Device serial: ', invDevice.serial)
        if (invDevice.serial === serial) {
            return true;
        }
    }
    return false;
}
</script>

