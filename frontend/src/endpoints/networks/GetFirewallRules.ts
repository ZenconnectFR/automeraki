import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const getFirewallRules = async (networkId: string) => {
    try {
        const response = await Axios.get(`/networks/${networkId}/firewallRules`);
        console.log("getFirewallRules response", response.data);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};