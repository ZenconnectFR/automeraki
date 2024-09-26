<script>
import Axios from 'axios';

/**
 * Remove a device from a network
 * @param {string} networkId - The id of the network
 * @param {string} serial - The serial of the device
 * @returns {Object} - The response from the API
 */

export async function removeDeviceFromNetwork(networkId, serial) {
    try {
        const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/networks/removeDevice`, {
            network_id: networkId,
            serial: serial
        })
        return response.data
    } catch (error) {
        console.error('[REMOVE DEVICE FROM NETWORK] Error: ', error)
        return null
    }
}
</script>
