import { getInventoryDevice } from '@/endpoints/organizations/GetInventoryDevice';

export async function checkDeviceInNetwork(serial: string, orgId: string): Promise<{ possessed: boolean, device: any }> {
    console.log('Checking device in network: ', serial)
    let device = await getInventoryDevice(orgId, serial);

    // check if the device is used by another network
    return device.networkId ? { possessed: true, device: device } : { possessed: false, device: device };
}
