import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

export async function updateWans(serial: string, payload : any) : Promise<any> {
    let wan1 = {}
    let wan2 = {}

    if (payload.wan1.use) {
        wan1 = {
            wanEnabled: "enabled",
            usingStaticIp: "true",
            staticIp: payload.wan1.ip,
            staticGatewayIp: payload.wan1.gateway,
            staticSubnetMask: payload.wan1.mask,
            staticDns: [payload.wan1.primaryDns, payload.wan1.secondaryDns]
        }
    }
    if (payload.wan2.use) {
        wan2 = {
            wanEnabled: "enabled",
            usingStaticIp: "true",
            staticIp: payload.wan2.ip,
            staticGatewayIp: payload.wan2.gateway,
            staticSubnetMask: payload.wan2.mask,
            staticDns: [payload.wan2.primaryDns, payload.wan2.secondaryDns]
        }
    }
    try {
        const response = await Axios.post('/devices/updateWans', {
            serial : serial,
            wan1: wan1,
            wan2: wan2
        })
        return response.data
    } catch (error) {
        console.error('[UPDATE WANS] Error: ', error)
    }
}
