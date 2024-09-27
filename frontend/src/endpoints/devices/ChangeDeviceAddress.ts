/**
 * Script to set the address of :
 * - a network thanks to the network id
 * - a device thanks to the device serial
 */

import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

/**
 * Sets the address of a device
 * @param {string} serial - The serial of the device
 * @param {string} address - The address to set
 */
export async function changeDeviceAddress(serial: string, address: string) {
    try {
        const response = await Axios.post(`/devices/address`, {
            serial: serial,
            address: address
        })
        console.log('[CDA] Response: ', response.data)
    } catch (error) {
        console.error('[CDA] Error: ', error)
    }
}
