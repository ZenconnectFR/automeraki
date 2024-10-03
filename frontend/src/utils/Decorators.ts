import { Ref } from 'vue';


/**
 *
 * @param refsTrue Array of Refs to set to true before calling the function and false after
 * @param refsFalse Array of Refs to set to false before calling the function and true after
 * @param fn : Function to call
 * @param complete Ref to set to true after the function is called
 * @returns Function that will set the refs to true before calling the function and false after
 */
export function useBoolStates(refsTrue: Ref<boolean>[], refsFalse: Ref<boolean>[], fn: (...args: any[]) => Promise<any> | void, complete: Ref<boolean> | null = null) {
    return async (...args: any[]) => {
        refsTrue.forEach(ref => ref.value = true);
        refsFalse.forEach(ref => ref.value = false);

        try {
            await fn(...args);
        } finally {
            refsTrue.forEach(ref => ref.value = false);
            refsFalse.forEach(ref => ref.value = true);
            if (complete) { complete.value = true;}
        }
    }
}
