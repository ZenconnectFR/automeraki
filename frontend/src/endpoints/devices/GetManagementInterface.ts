import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export async function getManagementInterface(serial: string): Promise<any> {
    try {
        const response = await Axios.get(`/devices/${serial}/managementInterface`);
        return response.data;
    } catch (error) {
        console.error("[GET MANAGEMENT INTERFACE] Error: ", error);
    }
}