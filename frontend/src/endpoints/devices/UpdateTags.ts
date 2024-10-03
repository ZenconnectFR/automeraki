import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export const updateTags = async (serial: string, tags: string[]) => {
    try {
        const response = await Axios.put(`/devices/updateTags`, {
            tags: tags,
            serial: serial
        })
        return response.data
    } catch (error) {
        throw new Error(error)
    }
}
