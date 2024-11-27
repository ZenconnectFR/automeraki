import { handleActionBatches } from './BatchManager'

export interface ManagementInterfaceBody {
    wan1: {
        wanEnabled: string,
        usingStaticIp: string,
        staticIp?: string,
        staticGatewayIp?: string,
        staticSubnetMask?: string,
        staticDns?: string[],
        vlan?: number
    }
}

const createBatchBody = (config: any[]) => {
    // turn the config array into an array of objects with the correct format
    let actions = [] as any[]
    for (const device of config) {
        let body: ManagementInterfaceBody;
        if (device.useDhcp.use) {
            body = {
                wan1: {
                    wanEnabled: "not configured",
                    usingStaticIp: "false",
                    vlan: device.config.vlan ? device.config.vlan : null
                }
            }
        } else {
            body = {
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
        }
        actions.push({
            resource: `/devices/${device.serial}/managementInterface`,
            operation: 'update',
            body: body
        })
    }
    return actions

}

export async function fixIpAssignments(config: any[], orgId: string) {
    const actions = createBatchBody(config);
    console.log(actions)    
    const res = await handleActionBatches(actions, orgId);
    return res
}

/*
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
*/
