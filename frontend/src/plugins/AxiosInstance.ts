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
    }
    return config;
});

axiosInstance.interceptors.response.use((response) => response, (error) => {
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
