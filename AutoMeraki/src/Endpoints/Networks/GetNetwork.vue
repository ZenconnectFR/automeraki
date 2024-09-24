<script>
import Axios from 'axios';

/**
 * Get the information of a network with its id
 * @param {string} networkId - The id of the network
 * @returns {Object} - The information of the network
 */
export async function getNetwork(networkId) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/networks/${networkId}`)
        return response.data
    } catch (error) {
        console.error(error)
        return null
    }
}
</script>
