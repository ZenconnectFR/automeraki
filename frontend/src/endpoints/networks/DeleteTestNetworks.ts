import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

export async function deleteTestNetworks() : Promise<any> {
    try {
        let response = await Axios.get(`/del_test_networks`)
        console.log('[DELETE TEST NETWORKS] Response: ', response.data)
        return response.data
    } catch (error) {
        console.error('[DELETE TEST NETWORKS] Error: ', error)
    }
}
