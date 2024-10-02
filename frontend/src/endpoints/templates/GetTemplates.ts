import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

export const getTemplates = async (orgId : string) => {
    try {
        const response = await Axios.get(`/organizations/${orgId}/templates`)
        return response.data
    } catch (error) {
        console.error(error)
        return []
    }
}
