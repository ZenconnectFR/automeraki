<script>
import Axios from 'axios';

/**
 * Get the information of a device with its serial
 * @param {string} serial - The serial of the device
 * @returns {Object} - The information of the device
 */
export async function getDevice(serial) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/devices/${serial}`)
        return response.data
    } catch (error) {
        console.error(error)
        return null
    }
}
</script>
