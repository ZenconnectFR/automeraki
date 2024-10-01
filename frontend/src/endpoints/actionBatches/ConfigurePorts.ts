import { axiosInstance as Axios } from '@/plugins/AxiosInstance'

const createBatchBody = (config: any[]) => {
    // turn the config array into an array of objects with the correct format
    let actions = [] as any[]
    for (const switchDevice of config) {
        for (const port of switchDevice.ports) {
            actions.push({
                resource: `/devices/${switchDevice.serial}/switch/ports/${port.id}`,
                operation: 'update',
                body: {
                    name: port.name,
                    vlan: port.vlan,
                    type: port.type,
                    enabled: 'true'
                }
            })
        }
    }
    return actions

}

export async function configurePortsBatch(config: any[], orgId: string) : Promise<any> {
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
