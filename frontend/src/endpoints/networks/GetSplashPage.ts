import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const getSplashPage = async(networkId: string) => {
    try {
        const response = await Axios.get(`/networks/${networkId}/splashPageSettings`);
        console.log('[GetSplashPage] response:', response.data);
        return response.data;
    } catch (error) {
        console.error('[GetSplashPage] error:', error);
        return error;
    }
};