<script>
/**
 * Script to set the address of :
 * - a network thanks to the network id
 * - a device thanks to the device serial
 */

import Axios from 'axios'

/**
 * Sets the address of a device
 * @param {string} serial - The serial of the device
 * @param {string} address - The address to set
 */
export async function changeDeviceAddress(serial, address) {
    try {
        const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/devices/address`, {
            serial: serial,
            address: address
        })
        console.log(response.data)
    } catch (error) {
        console.error(error)
    }
}
</script>
