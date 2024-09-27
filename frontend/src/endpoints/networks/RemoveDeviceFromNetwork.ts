import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

/**
 * Remove a device from a network
 * @param {string} networkId - The id of the network
 * @param {string} serial - The serial of the device
 * @returns {Object} - The response from the API
 */

export async function removeDeviceFromNetwork(networkId : string, serial : string) : Promise<any> {
    try {
        const response = await Axios.post(`/networks/removeDevice`, {
            network_id: networkId,
            serial: serial
        })
        return response.data
    } catch (error) {
        console.error('[REMOVE DEVICE FROM NETWORK] Error: ', error)
        return null
    }
}
