/**
 * Script to get the list of organizations
 */

import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

export async function getOrganizations() : Promise<any> {
    try {
        const response = await Axios.get(`/organizations`)
        console.log('[GET ORGANIZATIONS] Success: ', response.data)
        return response.data
    } catch (error) {
        console.error('[GET ORGANIZATIONS] Error: ', error)
        return null
    }
}
