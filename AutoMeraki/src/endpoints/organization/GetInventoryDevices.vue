<script>
import Axios from 'axios';

/**
 * Get the list of devices in the organization inventory
 * @param {string} orgId - The id of the organization
 * @returns {Object[]} - The list of devices in the inventory
 */

export async function getInventoryDevices(orgId, serials=null) {
    try {

        const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/organizations/inventory`,{
            org_id: orgId,
            serials: serials
        })
        console.log('[GET INVENTORY DEVICES] Response: ', response.data)
        return response.data
    } catch (error) {
        console.error('[GET INVENTORY DEVICES] Error: ', error)
        return null
    }
}
</script>
