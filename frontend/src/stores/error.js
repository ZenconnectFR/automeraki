import { defineStore } from "pinia";
import { ref } from "vue";

export const useErrorStore = defineStore("error", () => {
    const errors = ref([]);
    const addError = (error) => errors.value.push(error);
    const removeError = (index) => errors.value.splice(index, 1);
    const clearErrors = () => (errors.value = []);

    return {
        errors,
        addError,
        clearErrors,
        removeError
    };
});