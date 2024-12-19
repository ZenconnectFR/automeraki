import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export async function getApplications(networkId: string): Promise<any> {
    try {
        const response = await Axios.get(`/networks/${networkId}/applications`);
        return response.data;
    } catch (error) {
        console.error("getApplications error", error);
        return error
    }
}