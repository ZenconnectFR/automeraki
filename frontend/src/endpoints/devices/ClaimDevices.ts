/**
 * Script to claim devices to a network
 */

import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export async function claimDevices(newNetworkId : string, newNetworkDevices: string[]) {
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
    const response = await Axios.post(`/networks/claim`, {
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
