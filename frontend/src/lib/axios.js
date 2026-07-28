import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// The JWT is primarily carried by an httpOnly cookie. It is *also* mirrored into
// localStorage and sent as a Bearer header because in production the API lives on
// a different Vercel domain, making the auth cookie third-party — which Safari's
// ITP and several mobile browsers drop outright. Without this fallback, mobile
// login silently fails.
//
// This weakens the httpOnly guarantee: any XSS on the page can read the token.
// The correct fix is to make the cookie first-party by serving the API from the
// same origin as the frontend (a Vercel rewrite mapping /api/* to the backend
// deployment). Once that is in place, delete this interceptor and the two
// localStorage.setItem("token", …) calls in useLogin/useSignup.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);
