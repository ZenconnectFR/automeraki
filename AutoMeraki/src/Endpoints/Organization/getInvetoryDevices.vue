<script>
import Axios from 'axios';

/**
 * Get the list of devices in the organization inventory
 * @param {string} orgId - The id of the organization
 * @returns {Object[]} - The list of devices in the inventory
 */

export async function getInventoryDevices(orgId) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/organizations/${orgId}/inventory`)
        return response.data
    } catch (error) {
        console.error(error)
        return null
    }
}
</script>
