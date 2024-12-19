import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export async function updateMxSettings(networkId: string, settings: any) {
    try {
        const response = await Axios.put(`/updateMxSettings`, {
            network_id: networkId,
            payload: settings
        });
        return response.data;
    } catch (error) {
        console.error("[UPDATE MX SETTINGS] Error: ", error);
        return error;
    }
}