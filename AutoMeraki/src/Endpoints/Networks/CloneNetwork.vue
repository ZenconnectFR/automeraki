<script>
/**
 * Script to clone a network from a network id
 */

import Axios from 'axios'

export async function cloneNetwork(selectedNetwork, newNetworkNameInput, orgId) {
  if (!selectedNetwork.id) {
    console.log('No network selected')
    return null
  }
  if (!newNetworkNameInput) {
    console.log('No new network name entered')
    return null
  }

  console.log('Cloning network with body: id: ', selectedNetwork.id, ' name: ', newNetworkNameInput)
  try {
    const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/networks/clone`, {
      network_id: selectedNetwork.id,
      name: newNetworkNameInput,
      org_id: orgId
    })
    let newNetworkId = response.data.id
    let newNetworkName = response.data.name

    return { newNetworkId, newNetworkName }
  } catch (error) {
    console.error(error)
    return null
  }
}
</script>
