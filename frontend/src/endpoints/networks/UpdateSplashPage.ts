import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const updateSplashPage = async(networkId: string, splashPageSettings: any) => {
    try {
        const response = await Axios.put(`/networks/splashPageSettings/update`, {
            network_id: networkId,
            payload: splashPageSettings
        });
        return response.data;
    } catch (error) {
        console.error("updateSplashPage error", error);
        return error
    }
};