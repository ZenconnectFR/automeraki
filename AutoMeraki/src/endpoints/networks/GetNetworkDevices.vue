<script>
/**
 * Script to get the devices of a network
 *
 */
import Axios from 'axios'

/**
 * Gets the devices of a network
 * @param {string} networkId - The id of the network
 */

export async function getNetworkDevices(networkId) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/networks/${networkId}/devices`)
        console.log('[GET NETWORK DEVICES] Response: ', response.data)
    } catch (error) {
        console.error('[GET NETWORK DEVICES] Error: ', error)
    }
}
</script>
