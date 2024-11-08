import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export async function getMxSettings(networkId: string) {
    try {
        const response = await Axios.get(`/getMxSettings/${networkId}`);
        return response.data;
    } catch (error) {
        console.error("[GET MX SETTINGS] Error: ", error);
    }
}