import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

/** Single-flight refresh: concurrent 401s wait on one /auth/refresh call. */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        useAuthStore.getState().setSession(res.data.accessToken, res.data.user);
        return res.data.accessToken as string;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error || err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

export { refreshAccessToken };
