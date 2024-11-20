import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export async function enableWan(serial : string, wan: number) : Promise<any> {
    try {
        let wan1 = {}
        let wan2 = {}
        if (wan === 1) {
            wan1 = {
                wanEnabled: "enabled",
            }
        }
        if (wan === 2) {
            wan2 = {
                wanEnabled: "enabled",
            }
        }
        const response = await Axios.post('/devices/updateWans', {
            serial : serial,
            wan1: wan1,
            wan2: wan2
        })
        console.log('[ENABLE WAN] Response: ', response)
        return response.data
    } catch (error) {
        console.error('[ENABLE WAN] Error: ', error)
    }
}

export async function disableWan(serial : string, wan: number) : Promise<any> {
    try {
        let wan1 = {}
        let wan2 = {}
        if (wan === 1) {
            wan1 = {
                wanEnabled: "disabled",
            }
        }
        if (wan === 2) {
            wan2 = {
                wanEnabled: "disabled",
            }
        }
        const response = await Axios.post('/devices/updateWans', {
            serial : serial,
            wan1: wan1,
            wan2: wan2
        })
        console.log('[DISABLE WAN] Response: ', response)
        return response.data
    } catch (error) {
        console.error('[DISABLE WAN] Error: ', error)
    }
}
