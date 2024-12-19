/**
 * Script to clone a network from a network id
 */

import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

export async function cloneNetwork(selectedNetwork : string, newNetworkNameInput: string, orgId: string)
                                  : Promise<{ newNetworkId: string, newNetworkName: string} | null> {
	if (!selectedNetwork) {
		console.log('No network selected')
		return null
	}
	if (!newNetworkNameInput) {
		console.log('No new network name entered')
		return null
	}

	console.log('[CLONE EP] Cloning network with body: id: ', selectedNetwork, ' name: ', newNetworkNameInput)
	try {
		const response = await Axios.post(`/networks/clone`, {
		network_id: selectedNetwork,
		name: newNetworkNameInput,
		org_id: orgId
		})
		let newNetworkId = response.data.id
		let newNetworkName = response.data.name

		return { newNetworkId, newNetworkName }
	} catch (error) {
		console.error(error)
		return { newNetworkId: '', newNetworkName: '' }
	}
}
