import Axios from 'axios';
import { useSessionStore } from '@/stores/session';
import Router from './Router';

const axiosInstance = Axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
        // Authorization: `Bearer ${meta.env.VUE_APP_API_KEY}`,
        'ngrok-skip-browser-warning': 'true'
    },
});

axiosInstance.interceptors.request.use((config) => {
    const sessionStore = useSessionStore();
    const token = sessionStore.getSession();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['Refreshtoken'] = sessionStore.getRefreshToken();
    }
    return config;
});

axiosInstance.interceptors.response.use((response) => {
    console.log('[AxiosInstance] Response:', response);
    if (response.status === 207) {
        console.log('[AxiosInstance]: changing session token')
        // the token has been refreshed in the backend
        let newSessionToken = response.headers["authorization"];
        // console.log('authorization header: ', newSessionToken)
        if (!newSessionToken || typeof newSessionToken !== 'string') {
            console.error('[AxiosInstance] New session token is not a string:', newSessionToken);
            return response;
        } else {
            newSessionToken = newSessionToken.replace('Bearer ', '');
        }
        const newIdToken = response.headers["idtoken"];
        const newRefreshToken = response.headers["rsefreshtoken"];

        const sessionStore = useSessionStore();
        sessionStore.clearSession()
        sessionStore.setSession(newSessionToken);
        sessionStore.setIdToken(newIdToken);
        sessionStore.setRefreshToken(newRefreshToken);

        // console.log('[AxiosInstance] New session token:', newSessionToken);
        return response;
    }
    return response;
}
, async (error) => {
    console.log('[AxiosInstance] Error:', error);
    if (error.response.status === 401) {
        const sessionStore = useSessionStore();
        sessionStore.clearSession();
        Router.push({ path: '/login', query: { forbidden: 'true' } });
    }
    if (error.response.status === 498) {
        const sessionStore = useSessionStore();
        sessionStore.clearSession();
        Router.push({ path: '/login', query: { expired: 'true' } });
    }
    return Promise.reject(error);
});

export { axiosInstance };
