import Axios from 'axios';
import { useSessionStore } from '@/stores/session';
import Router from './Router';

const axiosInstance = Axios.create({
    baseURL: 'http://localhost:8000',
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
        // the token has been refreshed in the backend
        const newSessionToken = response.headers["Authorization"].split(' ')[1];
        const newIdToken = response.headers["Idtoken"];
        const newRefreshToken = response.headers["Refreshtoken"];

        const sessionStore = useSessionStore();
        sessionStore.setSession(newSessionToken);
        sessionStore.setIdToken(newIdToken);
        sessionStore.setRefreshToken(newRefreshToken);

        console.log('[AxiosInstance] New session token:', newSessionToken);
        delete response.data.extra_new_token;
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

        /*
        const sessionStore = useSessionStore();
        // use the refresh token to get a new session token
        console.log('[AxiosInstance] Refreshing token');
        const refreshToken = sessionStore.getRefreshToken();
        if (refreshToken) {
            const oktaDomain = 'zenconnect.okta.com';
            console.log('[AxiosInstance] Refresh token:', refreshToken);

            const data = {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                scope: 'openid offline_access',
                client_id: '0oa17tl96kdAzHuA70x8',
            };

            try {
                const resp = await Axios.post(`https://${oktaDomain}/oauth2/v1/token`, data,
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                )
        
                sessionStore.setSession(resp.data.access_token);
                sessionStore.setIdToken(resp.data.id_token);
                sessionStore.setRefreshToken(resp.data.refresh_token);

                console.log('[AxiosInstance] New session token:', resp.data.access_token);

                // retry the original request here
                error.config.headers['Authorization'] = `Bearer ${resp.data.access_token}`;
                return Axios.request(error.config);
            } catch (error) {
                console.error('[AxiosInstance] Error refreshing token:', error);
                Router.push({ path: '/', query: { login: 'false' } })
            }
        } else {
            sessionStore.clearSession();
            Router.push({ path: '/login', query: { forbidden: 'true' } });
        }
        */
       
        const sessionStore = useSessionStore();
        sessionStore.clearSession();
        Router.push({ path: '/login', query: { expired: 'true' } });
    }
    return Promise.reject(error);
});

export { axiosInstance };
