import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export async function updateMTUSize(networkId: string, mtuSize: number) {
    try {
        const response = await Axios.post(`/networks/updateMTUSize`, {
            mtu: mtuSize,
            networkId: networkId
        })
        return response.data
    } catch (error) {
        console.error('[UPDATE MTU SIZE] Error: ', error)
    }
}
