import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

const createBatchBody = (config: any[], networkId : string) => {
    // turn the config array into an array of objects with the correct format
    let actions = [] as any[]
    for (const switchDevice of config) {
        for (const port of switchDevice.ports) {
            actions.push({
                resource: `/networks/${networkId}/appliance/ports/${port.id}`,
                operation: 'update',
                body: {
                    vlan: port.vlan,
                    type: port.type
                }
            })
        }
    }
    return actions

}

export async function configurePerPortVlan(config: any[], orgId: string, networkId : string) : Promise<any> {
    const actions = createBatchBody(config, networkId)
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
