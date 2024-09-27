<script>
import Axios from 'axios'

/**
 * Enable VLANs in a network
 * @param {string} networkId - The network ID
 * @returns {Promise} - The response
 */

export async function enableVlans(networkId) {
    console.log('[VLAN] Enabling VLANs in network: ', networkId)
    let response = await Axios.put(`${import.meta.env.VITE_APP_API_URL}/networks/enableVlans/${networkId}`)
    if (response && response.data) {
        console.log('[VLAN] VLANs enabled: ', response.data)
        return response.data
    } else {
        console.error('[VLAN] Error enabling VLANs')
        return null
    }
}
</script>
