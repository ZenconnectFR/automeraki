import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export async function getNetworkSsids(networkId: string) {
    const res = await Axios.get(`/networks/${networkId}/ssids`);
    return res.data;
}