import { axiosInstance as Axios} from '@/plugins/AxiosInstance';

/**
 * Get the ports of a device with its serial
 * @param {string} serial - The serial of the device
 * @returns {Object} - The ports of the device
 */

export async function getPorts(serial: string): Promise<any> {
    try {
        const response = await Axios.get(`/devices/${serial}/ports`);
        return response.data;
    } catch (error) {
        console.error('[GET PORTS] Error: ', error);
        return {};
    }
}
