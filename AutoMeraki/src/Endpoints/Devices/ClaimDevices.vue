<script>
/**
 * Script to claim devices to a network
 */

import Axios from 'axios'
import { parseDevices } from '../../Utils/Misc.vue'

export async function ClaimDevices(newNetworkId, newNetworkDevices) {
  if (!newNetworkId) {
    console.log('No new network id')
    return null
  }
  if (!newNetworkDevices) {
    console.log('No new network devices entered')
    return null
  }
  let devices = parseDevices(newNetworkDevices)
  console.log('Adding devices to network with body: id: ', newNetworkId, ' devices: ', devices)
  try {
    const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/networks/claim`, {
      network_id: newNetworkId,
      serials: devices
    })
    console.log(response.data)
    return response.data
  } catch (error) {
    console.error(error)
    return null
  }
}
</script>
