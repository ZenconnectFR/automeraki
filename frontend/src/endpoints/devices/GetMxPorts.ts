import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const getMxPorts = async (networkId: string) => {
    try {
        const response = await Axios.get(`/devices/${networkId}/mxports`);
        return response.data;
    } catch (error) {
        console.error("GetMxPorts error: ", error);
        return null;
    }
};