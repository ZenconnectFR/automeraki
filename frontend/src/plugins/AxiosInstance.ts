import Axios from 'axios';

const axiosInstance = Axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    // Authorization: `Bearer ${meta.env.VUE_APP_API_KEY}`,
    'ngrok-skip-browser-warning': 'true' 
  },
});

export { axiosInstance };
