

import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

/**
 * Get the information of a device with its serial
 * @param {string} serial - The serial of the device
 * @returns {Object} - The information of the device
 */
export async function getDevice(serial : string): Promise<object> {
    try {
        const response = await Axios.get(`/devices/${serial}`)
        return response.data
    } catch (error) {
        console.error('[GET DEVICE] Error: ', error)
        return {}
    }
}
