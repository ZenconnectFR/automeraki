/**
 * Script to get the networks of an organization
 *
 */

import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

/**
 * Gets the networks of an organization
 * @param {string} orgId - The id of the organization
 */

export async function getNetworks(orgId : string) : Promise<any> {
    try {
        const response = await Axios.get(`/organizations/${orgId}/networks`)
        console.log('[GET NETWORKS] Response: ', response.data)
        return response.data
    } catch (error) {
        console.error('[GET NETWORKS] Error: ', error)
        return null
    }
}
