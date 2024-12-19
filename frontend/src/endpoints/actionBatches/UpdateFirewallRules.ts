import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const updateFirewallRules = async (networkId: string, payload: any) => {
    try {
        const response = await Axios.put(`/networks/firewallRules/update`, {
            network_id: networkId,
            payload: payload
        });
        console.log("updateFirewallRules response", response.data);
        return response.data;
    } catch (error) {
        console.error("updateFirewallRules error", error);
        return error
    }
};