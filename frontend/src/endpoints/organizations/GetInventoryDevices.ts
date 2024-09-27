import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

/**
 * Gets the devices of an organization
 * @param {string} orgId - The id of the organization
 * @param {Array<string>} serials - The serials of the devices
 */

export async function getInventoryDevices(orgId : string, serials: Array<string>=[]) : Promise<any> {
    try {
        const response = await Axios.post(`/organizations/inventory`,{
            org_id: orgId,
            serials: serials
        })
        console.log('[GET INVENTORY DEVICES] Response: ', response.data)
        return response.data
    } catch (error) {
        console.error('[GET INVENTORY DEVICES] Error: ', error)
        return null
    }
}
