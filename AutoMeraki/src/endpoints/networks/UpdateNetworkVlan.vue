<script>
import Axios from 'axios'

/**
 * Update a VLAN in a network
 * @param {string} networkId - The network ID
 * @param {array} vlansConfigured - The VLANs configured [ {id: str, payload : [{set of actions 1}, {set of actions to do after action 1}, ...]}, ...]
 * @returns {Promise} - The response
 */

export async function updateNetworkVlan(networkId, vlansConfigured) {
    console.log('[AVLAN] Updating network VLAN: ', networkId, vlansConfigured)
    let response = await Axios.put(`${import.meta.env.VITE_APP_API_URL}/networks/updateNetworkVlan`, {
        network_id: networkId,
        options: vlansConfigured
    },
    {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    if (response && response.data) {
        console.log('[AVLAN] Network VLAN updated: ', response.data)
        return response.data
    } else {
        console.error('[AVLAN] Error updating network VLAN')
        return null
    }
}
</script>
