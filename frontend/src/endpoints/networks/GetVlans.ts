import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export const getVlans = async (networkId : string) => {
    try {
        const response = await Axios.get(`/networks/${networkId}/vlans`)
        return response.data
    } catch (error) {
        throw new Error(error)
    }
}
