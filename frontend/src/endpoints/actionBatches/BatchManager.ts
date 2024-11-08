import { axiosInstance as Axios } from "@/plugins/AxiosInstance"
import { getActionBatchStatus } from "./GetActionBatch"

// split the actions into batches of batchSize. Beware of the last batch, it may be smaller than batchSize
// returns an array of arrays
export const splitBatches = (actions: any[], batchSize: number) => {
    let batches = [] as any[]
    for (let i = 0; i < actions.length; i += batchSize) {
        batches.push(actions.slice(i, i + batchSize))
    }
    return batches
}

export async function sendBatch(batch: any[], orgId: string) {
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

export async function handleActionBatches(actions: any, orgId: string) {
    const pendingBatches: {batchId: string, status: string}[] = [];
    const completedBatches: any[] = [];
    console.log('Initial actions: ', actions)
    const batches = splitBatches(actions, 8)

    console.log('Initial Batches: ', batches)

    // initial send of the first 5 batches
    for (let i = 0; i < 5; i++) {
        if (pendingBatches.length < 5 && batches.length > 0) {
            console.log('Sending batch: ', batches[0], 'with pending batches: ', pendingBatches)
            const response = await sendBatch(batches[0], orgId)
            pendingBatches.push({batchId: response.id, status: response.status.completed})
            console.log('Batch sent: ', response.id, 'with status: ', response.status.completed)
            // console.log('Pending batches: ', pendingBatches)
            // remove the batch from the list of batches
            batches.shift()
            // console.log('Remaining batches: ', batches)
        } else {
            // console.log('Max number of batches sent, breaking, pending batches: ', pendingBatches)
            break
        }
    }

    console.log('Initial batches sent, pending batches: ', pendingBatches.length, 'remaining batches: ', batches)

    // check the status of the pending batches, when one is done, send the next batch
    while (pendingBatches.length > 0) {
        for (let i = 0; i < pendingBatches.length; i++) {
            const batch = pendingBatches[i]
            console.log('Checking batch: ', batch)
            const status = await getActionBatchStatus(batch.batchId, orgId)
            // console.log('Status of batch: ', status)
            if (status.status.completed) {
                console.log('Batch completed: ', batch)
                completedBatches.push(status)
                pendingBatches.splice(i, 1)
                console.log('Pending batches: ', pendingBatches)
                console.log('Remaining batches: ', batches)
                console.log('Sending next batch if available')
                if (batches.length > 0) {
                    console.log('Sending next batch')
                    const newBatch = batches.shift()
                    console.log('New batch: ', newBatch)
                    const response = await sendBatch(newBatch, orgId)
                    console.log('Batch sent: ', response.id, 'with status: ', response.status.completed)
                    pendingBatches.push({batchId: response.id, status: response.status.completed})
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