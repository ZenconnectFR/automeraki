import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export const updateTags = async (serial: string, tags: string[]) => {
    try {
        const response = await Axios.put(`/devices/updateTags`, {
            tags: tags,
            serial: serial
        })
        console.log('updateTags response', response.data)
        return response.data
    } catch (error) {
        console.error('[UPDATE TAGS] Error: ', error)
        return null
    }
}
