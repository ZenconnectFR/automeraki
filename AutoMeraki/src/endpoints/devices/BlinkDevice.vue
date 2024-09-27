<script>
import Axios from 'axios'

export async function blinkDevice(serial) {
    try {
        const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/devices/${serial}/blink`)
        console.log('[BLINK DEVICE] Response: ', response.data)
        return response.data
    } catch (error) {
        console.error('[BLINK DEVICE] Error: ', error)
    }
}
</script>
