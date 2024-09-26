<script>
/**
 * Script to get the networks of an organization
 *
 */

import Axios from 'axios'

/**
 * Gets the networks of an organization
 * @param {string} orgId - The id of the organization
 */

export async function getNetworks(orgId) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/organizations/${orgId}/networks`)
        console.log('[GET NETWORKS] Response: ', response.data)
        return response.data
    } catch (error) {
        console.error('[GET NETWORKS] Error: ', error)
    }
}
</script>
