<script>
/**
 * Script to claim devices to a network
 */

import Axios from 'axios'

export async function claimDevices(newNetworkId, newNetworkDevices) {
  if (!newNetworkId) {
    console.log('No new network id')
    return null
  }
  if (!newNetworkDevices || newNetworkDevices.length === 0) {
    console.log('No new network devices entered')
    return { serials: [] }
  }
  console.log('[CLAIM ENPOINT] Adding devices to network with body: id: ', newNetworkId, ' devices: ', newNetworkDevices)
  try {
    const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/networks/claim`, {
      network_id: newNetworkId,
      serials: newNetworkDevices
    })
    console.log('[CLAIM ENPOINT] Response: ', response.data)
    return response.data
  } catch (error) {
    console.error('[CLAIM ENPOINT] Error: ', error)
    return null
  }
}
</script>
