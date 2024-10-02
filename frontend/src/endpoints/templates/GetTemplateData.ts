import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

export const getTemplateData = async (orgId : string, templateId : string) => {
    try {
        const response = await Axios.get(`/organizations/${orgId}/templates/${templateId}`)
        return response.data
    } catch (error) {
        console.error(error)
        return []
    }
}
