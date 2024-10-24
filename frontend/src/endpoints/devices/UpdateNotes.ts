import { axiosInstance as Axios } from "@/plugins/AxiosInstance";

export async function updateNotes(serial: string, notes: string) {
    try {
        const response = await Axios.put(`/devices/updateNotes`, {
            notes: notes,
            serial: serial
        });
        return response.data;
    } catch (error) {
        console.error("[UPDATE NOTES] Error: ", error);
    }
}