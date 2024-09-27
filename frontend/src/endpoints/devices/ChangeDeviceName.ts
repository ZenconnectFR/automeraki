import { axiosInstance as Axios } from "@/plugins/AxiosInstance"

export async function changeDeviceName(serial: string, name: string) {
    try {
        const response = await Axios.post(`/devices/name`, {
            serial: serial,
            name: name
        })
        console.log('[CNE] Response: ', response.data)
    } catch (error) {
        console.error('[CNE] Error: ', error)
    }
}
