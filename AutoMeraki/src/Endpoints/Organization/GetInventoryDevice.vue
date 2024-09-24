<script>
import Axios from 'axios';

/**
 * Get the list of devices in the organization inventory
 * @param {string} orgId - The id of the organization
 * @param {string} serial - The serial of the device
 * @returns {Object[]} - The list of devices in the inventory
 */

export async function getInventoryDevice(orgId, serial) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/organizations/${orgId}/inventory/${serial}`)
        return response.data
    } catch (error) {
        console.error('[GET INVENTORY DEVICE] Error: ', error)
        return null
    }
}
</script>
