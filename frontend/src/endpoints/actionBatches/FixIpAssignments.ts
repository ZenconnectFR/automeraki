import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

const createBatchBody = (config: any[]) => {
    // turn the config array into an array of objects with the correct format
    let actions = [] as any[]
    for (const device of config) {
        actions.push({
            resource: `/devices/${device.serial}/managementInterface`,
            operation: 'update',
            body: {
                wan1: {
                    wanEnabled: "enabled",
                    usingStaticIp: "true",
                    staticIp: device.config.ip,
                    staticGatewayIp: device.config.gateway,
                    staticSubnetMask: device.config.mask,
                    staticDns: [device.config.primaryDns, device.config.secondaryDns],
                    vlan: device.config.vlan ? device.config.vlan : null
                }
            }
        })
    }
    return actions

}

export async function fixIpAssignments(config: any[], orgId: string) : Promise<any> {
    const actions = createBatchBody(config)
    try {
        console.log(actions)
        console.log(orgId)
        const response = await Axios.post('/startActionBatch', {
            orgId : orgId,
            actions : actions
        })
        return response.data
    } catch (error) {
        console.error('[CONFIGURE PORTS] Error: ', error)
    }
}
