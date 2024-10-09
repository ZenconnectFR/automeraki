import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const getVpnStatuses = async (orgId: string) => {
    try {
        const response = await Axios.get(`/organizations/${orgId}/vpnStatuses`);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};