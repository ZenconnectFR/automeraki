<script>
import { getInventoryDevice } from '@/endpoints/organizations/GetInventoryDevice.vue';

/**
 * For a device, check if it is used by another network
 * @param {string} serial - The serial of the device to check
 * @returns {boolean} - True if the device is used by another network, false otherwise
 */

export async function checkDeviceInNetwork(serial, orgId) {
    console.log('Checking device in network: ', serial)
    let device = await getInventoryDevice(orgId, serial);

    // check if the device is used by another network
    return device.networkId ? { possessed: true, device: device } : { possessed: false, device: device };
}


// TODO: Move the checkDeviceInInventory function here

// TODO: Move the checkClaimedDevices function here
</script>
