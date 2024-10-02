import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export const updateSTPSettings = async (networkId: string, stpSettings: any[]) : Promise<any> => {
    try {
        const response = await Axios.put(`/networks/updateSTPSettings`, {
            network_id: networkId,
            rstpEnabled: true,
            stpBridgePriority: stpSettings
        })
        return response.data
    } catch (error) {
        console.error('Error while updating STP settings', error)
        return null
    }
}
