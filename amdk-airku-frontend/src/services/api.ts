import axios from 'axios';

// Fungsi untuk menentukan base URL API
const getApiBaseUrl = () => {
  // NOTE: This api instance is deprecated. The app now uses Supabase for all API calls.
  // Only kept for backward compatibility with shipment and capacity services.
  
  // 1️⃣ Cek dari environment variable (.env)
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // 2️⃣ Kalau sedang di localhost (dev), pakai local backend
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return 'http://localhost:3001/api';
  }

  // 3️⃣ For production, this should not be used anymore. All API calls should go through Supabase.
  console.warn('Using deprecated railway API. Please migrate to Supabase.');
  return 'https://ku-airku-production-b800.up.railway.app/api';
};

// Buat instance axios
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log all requests made with this api instance
api.interceptors.request.use(
  (config) => {
    console.warn('[DEPRECATED API] Request to:', config.url, 'This should not be used for auth!');
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor untuk handle errors (DISABLED auto-logout - let Supabase auth handle it)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-logout on 401 - Supabase auth handles session management
    // This interceptor is only for deprecated railway API calls
    if (error.response?.status === 401) {
      console.warn('[DEPRECATED API] Got 401 but not auto-logging out. Check Supabase session.');
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;
