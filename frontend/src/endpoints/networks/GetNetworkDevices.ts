/**
 * Script to get the devices of a network
 *
 */
import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

/**
 * Gets the devices of a network
 * @param {string} networkId - The id of the network
 */

export async function getNetworkDevices(networkId : string) : Promise<any> {
    try {
        const response = await Axios.get(`/networks/${networkId}/devices`)
        return response.data
    } catch (error) {
        console.error('[GET NETWORK DEVICES] Error: ', error)
        return null
    }
}
