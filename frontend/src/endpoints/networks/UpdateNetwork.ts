import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const updateNetwork = async (networkId: string, payload: any) => {
    try {
        const response = await Axios.put(`/networks/update`, {
            networkId: networkId,
            payload: payload,
        });
        console.log("updateNetwork response", response.data);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};