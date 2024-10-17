import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export const getPolicyObjects = async (organizationId: string) => {
    try {
        const response = await Axios.get(`/organizations/${organizationId}/policyObjects`);
        console.log("getPolicyObjects response", response.data);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};