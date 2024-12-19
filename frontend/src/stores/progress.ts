import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

export const useProgressStore = defineStore("progress", () => {
    const devicesListSave = useStorage("devicesListSave", [] as any[]);
    const stepSave = useStorage("stepSave", 0);
    const orgIdSave = useStorage("orgIdSave", "");
    const networkIdSave = useStorage("networkIdSave", "");
    const templatePathSave = useStorage("templatePathSave", "");
    const unlockedStates = useStorage("unlockedStates", [] as boolean[]);
    const progressSaved = useStorage("progressSaved", false);

    const initSave = (orgId: string, networkId: string, templatePath: string) => {
        deleteSave();

        orgIdSave.value = orgId;
        networkIdSave.value = networkId;
        templatePathSave.value = templatePath;
        progressSaved.value = true;
    }

    const save = (devicesList: any[], step: number, nextStates: boolean[]) => {
        devicesListSave.value = devicesList;
        stepSave.value = step;
        unlockedStates.value = nextStates;
    }

    const deleteSave = () => {
        devicesListSave.value = [];
        stepSave.value = 0;
        orgIdSave.value = "";
        networkIdSave.value = "";
        templatePathSave.value = "";
        unlockedStates.value = [];
        progressSaved.value = false;
    }

    const isProgressSaved = () => {
        return progressSaved.value;
    }

    const setProgressSaved = (value: boolean) => {
        progressSaved.value = value;
    }

    const getDevicesListSave = () => {
        return devicesListSave.value;
    }

    const getStepSave = () => {
        return stepSave.value;
    }

    const getOrgIdSave = () => {
        return orgIdSave.value;
    }

    const getNetworkIdSave = () => {
        return networkIdSave.value;
    }

    const getTemplatePathSave = () => {
        return templatePathSave.value;
    }

    const getUnlockedStates = () => {
        return unlockedStates.value;
    }

    return {
        devicesListSave,
        stepSave,
        orgIdSave,
        networkIdSave,
        templatePathSave,
        unlockedStates,
        progressSaved,
        initSave,
        save,
        deleteSave,
        isProgressSaved,
        setProgressSaved,
        getDevicesListSave,
        getStepSave,
        getOrgIdSave,
        getNetworkIdSave,
        getTemplatePathSave,
        getUnlockedStates
    }
});