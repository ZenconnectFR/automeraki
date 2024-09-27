<script>
import Axios from 'axios'

export function deleteTestNetworks(networks) {
    try {
        let response = Axios.get(`${import.meta.env.VITE_APP_API_URL}/del_test_networks`)
        console.log('[DELETE TEST NETWORKS] Response: ', response.data)
        return response.data
    } catch (error) {
        console.error('[DELETE TEST NETWORKS] Error: ', error)
    }
}
</script>
