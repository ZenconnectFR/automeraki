import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const updateSiteToSiteVpn = async (networkId: string, payload: any) => {
    try {
        const response = await Axios.put(`/networks/siteToSiteVpn/update`, {
            network_id: networkId,
            payload: payload
        });
        console.log("updateSiteToSiteVpn response", response.data);
        return response.data;
    } catch (error) {
        console.error("updateSiteToSiteVpn error", error);
        return error
    }
};