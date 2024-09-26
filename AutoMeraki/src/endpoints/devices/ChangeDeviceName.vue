<script>
import Axios from 'axios'

export async function changeDeviceName(serial, name) {
    try {
        const response = await Axios.post(`${import.meta.env.VITE_APP_API_URL}/devices/name`, {
            serial: serial,
            name: name
        })
        console.log('[CNE] Response: ', response.data)
    } catch (error) {
        console.error('[CNE] Error: ', error)
    }
}
</script>
