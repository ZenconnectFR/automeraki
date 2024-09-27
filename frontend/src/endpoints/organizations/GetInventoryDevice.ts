import { axiosInstance as Axios } from "@/plugins/AxiosInstance"


export async function getInventoryDevice(orgId: string, serial: string): Promise<any> {
    try {
        const response = await Axios.get(`/organizations/${orgId}/inventory/${serial}`)
        return response.data
    } catch (error) {
        console.error('[GET INVENTORY DEVICE] Error: ', error)
        return null
    }
}
