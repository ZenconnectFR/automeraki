import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export async function getActionBatchStatus(batchId: string, orgId : string) : Promise<any> {
    try {
        const response = await Axios.get(`/organizations/${orgId}/actionBatches/${batchId}`)
        return response.data
    } catch (error) {
        console.error('[GET ACTION BATCH] Error: ', error)
    }
}
