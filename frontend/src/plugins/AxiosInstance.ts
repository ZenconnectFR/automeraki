import Axios from 'axios';

const axiosInstance = Axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true' 
    // Authorization: `Bearer ${meta.env.VUE_APP_API_KEY}`,
  },
});

export { axiosInstance };
