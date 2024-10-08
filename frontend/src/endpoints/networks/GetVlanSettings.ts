import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const getVlanSettings = async (networkId: string) => {
    try {
        const response = await Axios.get(`/networks/${networkId}/vlanSettings`);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};
