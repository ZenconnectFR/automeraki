<script>
import Axios from 'axios';

/**
 * Create a new VLAN if it does not exist
 * @param {string} networkId - The id of the network
 * @param {Object[]} vlans - The list of vlans to create if they do not exist
 * @returns void
 */

export async function createVlansIfNotExists(networkId, vlans) {
    try {
        let createdVlans = []

        // 1 - get the list of vlans in the network
        const currentVlans = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/networks/${networkId}/vlans`)
        console.log('[VLAN] Existing vlans: ', currentVlans.data)
        // 2 - check if the vlans in the list are in the vlans array
        for (const vlan of vlans) {
            let found = false
            for (const currentVlan of currentVlans.data) {
                if (currentVlan.id === vlan.id) {
                    found = true
                    break
                }
            }
            // 3 - if the vlan is not found, create it
            if (!found) {
                console.log('[VLAN] Creating vlan: ', vlan)
                const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/networks/createVlan`, {
                    network_id: networkId,
                    id: vlan.id,
                    name: vlan.payload[0].name,
                    applianceIp: vlan.payload[0].applianceIp,
                    subnet: vlan.payload[0].subnet
                })
                console.log('[VLAN] Vlan created: ', response.data)
                createdVlans.push(vlan.payload[0].id)
            }
        }
        return createdVlans
    } catch (error) {
        console.error('[VLAN] Error creating vlans: ', error)
        console.error(error)
        return null
    }
}
</script>
