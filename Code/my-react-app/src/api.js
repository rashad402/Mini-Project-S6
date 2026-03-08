import axios from 'axios';

// In production (single-origin), VITE_API_URL is not needed — use '' for relative paths.
// In local dev, set VITE_API_URL=http://localhost:3000 in .env
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

export default api;
export { API_URL };
