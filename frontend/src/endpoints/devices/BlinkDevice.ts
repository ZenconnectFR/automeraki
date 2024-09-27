import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export async function blinkDevice(serial : string) {
    try {
        const response = await Axios.get(`/devices/${serial}/blink`)
        return response.data
    } catch (error) {
        console.error('[BLINK DEVICE] Error: ', error)
    }
}

