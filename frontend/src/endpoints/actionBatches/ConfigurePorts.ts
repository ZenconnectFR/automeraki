import { handleActionBatches } from './BatchManager'

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
                    enabled: 'true',
                    voiceVlan: port.voiceVlan? port.voiceVlan : null,
                }
            })
        }
    }
    return actions
}

export async function configurePortsBatch(config: any[], orgId: string) {
    const actions = createBatchBody(config);
    const res = await handleActionBatches(actions, orgId);
    return res
}

/*

// split the actions into batches of batchSize. Beware of the last batch, it may be smaller than batchSize
// returns an array of arrays
const splitBatches = (actions: any[], batchSize: number) => {
    let batches = [] as any[]
    for (let i = 0; i < actions.length; i += batchSize) {
        batches.push(actions.slice(i, i + batchSize))
    }
    return batches
}

async function sendBatch(batch: any[], orgId: string) {
    try {
        const response = await Axios.post(`/startActionBatch`, {
            orgId: orgId,
            actions: batch
        })
        return response.data
    } catch (error) {
        console.error('[CONFIGURE PORTS BATCH] Error: ', error)
    }
}



export async function configurePortsBatch(config: any[], orgId: string) : Promise<any> {
    const actions = createBatchBody(config)
    const pendingBatches: {batchId: string, status: string}[] = [];
    const completedBatches: any[] = [];
    const batches = splitBatches(actions, 100)

    // console.log('Initial Batches: ', batches)

    // initial send of the first 5 batches
    for (let i = 0; i < 5; i++) {
        if (pendingBatches.length < 5 && batches.length > 0) {
            // console.log('Sending batch: ', batches[0], 'with pending batches: ', pendingBatches)
            const response = await sendBatch(batches[0], orgId)
            pendingBatches.push({batchId: response.id, status: response.status.completed})
            // console.log('Batch sent: ', response.id, 'with status: ', response.status.completed)
            // console.log('Pending batches: ', pendingBatches)
            // remove the batch from the list of batches
            batches.shift()
            // console.log('Remaining batches: ', batches)
        } else {
            // console.log('Max number of batches sent, breaking, pending batches: ', pendingBatches)
            break
        }
    }

    // console.log('Initial batches sent, pending batches: ', pendingBatches.length, 'remaining batches: ', batches)

    // check the status of the pending batches, when one is done, send the next batch
    while (pendingBatches.length > 0) {
        for (let i = 0; i < pendingBatches.length; i++) {
            const batch = pendingBatches[i]
            // console.log('Checking batch: ', batch)
            const status = await getActionBatchStatus(batch.batchId, orgId)
            // console.log('Status of batch: ', status)
            if (status.status.completed) {
                // console.log('Batch completed: ', batch)
                completedBatches.push(status)
                pendingBatches.splice(i, 1)
                // console.log('Pending batches: ', pendingBatches)
                // console.log('Remaining batches: ', batches)
                // console.log('Sending next batch if available')
                if (batches.length > 0) {
                    // console.log('Sending next batch')
                    const newBatch = batches.shift()
                    // console.log('New batch: ', newBatch)
                    const response = await sendBatch(newBatch, orgId)
                    // console.log('Batch sent: ', response.id, 'with status: ', response.status.completed)
                    pendingBatches.push({batchId: response.batchId, status: response.status})
                }
            } else {
                // console.log('Batch not completed yet')
            }
        }
        // console.log('Waiting 1 second before checking again')
        await new Promise(r => setTimeout(r, 1000))
    }

    return completedBatches
}
*/