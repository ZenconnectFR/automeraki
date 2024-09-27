import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

/**
 * Get the information of a network with its id
 * @param {string} networkId - The id of the network
 * @returns {Object} - The information of the network
 */
export async function getNetwork(networkId : string) : Promise<any> {
    try {
        const response = await Axios.get(`/networks/${networkId}`)
        return response.data
    } catch (error) {
        console.error('[GET NETWORK] Error: ', error)
        return null
    }
}
