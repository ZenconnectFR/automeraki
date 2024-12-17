import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

export const useSessionStore = defineStore("session", () => {
    const session = useStorage("session", '')
    const idToken = useStorage("idToken", '')
    const stateString = useStorage("stateString", '')
    const codeVerifier = useStorage("codeVerifier", '')
    const refreshToken = useStorage("refreshToken", '')
    const getSession = () => session.value
    const setSession = (token: string) => session.value = token
    const getIdToken = () => idToken.value
    const setIdToken = (token: string) => idToken.value = token
    const getCodeVerifier = () => codeVerifier.value
    const setCodeVerifier = (verifier: string) => codeVerifier.value = verifier
    const getStateString = () => stateString.value
    const setStateString = (state: string) => stateString.value = state
    const getRefreshToken = () => refreshToken.value
    const setRefreshToken = (token: string) => refreshToken.value = token
    const clearSession = () => {
        session.value = ''
        idToken.value = ''
        stateString.value = ''
        codeVerifier.value = ''
        refreshToken.value = ''
    }

    return {
        session,
        idToken,
        stateString,
        codeVerifier,
        refreshToken,
        setSession,
        clearSession,
        getSession,
        getIdToken,
        setIdToken,
        getCodeVerifier,
        setCodeVerifier,
        getStateString,
        setStateString,
        getRefreshToken,
        setRefreshToken
    }
});
