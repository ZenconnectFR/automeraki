import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export const getSiteToSiteVpn = async (networkId : string) => {
  try {
    const response = await Axios.get(`/networks/${networkId}/siteToSiteVpn`)
    return response.data
  } catch (error) {
    throw new Error(error)
  }
}
