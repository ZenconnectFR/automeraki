import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export const getSiteToSiteVpn = async (networkId : string) => {
    try {
        const response = await Axios.get(`/networks/${networkId}/siteToSiteVpn`)
        return response.data
    } catch (error) {
        console.error('getSiteToSiteVpn error', error)
        return error
    }
}
