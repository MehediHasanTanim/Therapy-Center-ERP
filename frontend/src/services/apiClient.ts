import axios, { AxiosHeaders, AxiosRequestConfig } from "axios";
import { mockAdapter } from "./mockAdapter";
import { authTokenStore } from "./tokenStore";

const useMockApi = import.meta.env.VITE_USE_MOCK_API === "true";

export const apiClient = axios.create({
  baseURL: useMockApi ? "" : "/api/v1",
  adapter: useMockApi ? mockAdapter : undefined
});

let refreshPromise: Promise<string> | null = null;
type RetryableRequest = AxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.request.use((config) => {
  const token = authTokenStore.getAccessToken();
  if (token) {
    const headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequest;
    if (error.response?.status !== 401 || originalRequest?._retry || originalRequest?.url === "/auth/refresh/") {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = apiClient
        .post("/auth/refresh/", { refresh_token: authTokenStore.getRefreshToken() })
        .then((res) => {
          const tokens = {
            accessToken: res.data.access_token as string,
            refreshToken: res.data.refresh_token as string,
            expiresAt: Date.now() + 30 * 60 * 1000
          };
          authTokenStore.setTokens(tokens);
          return tokens.accessToken;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newAccessToken = await refreshPromise;
    const headers = originalRequest.headers instanceof AxiosHeaders ? originalRequest.headers : new AxiosHeaders();
    headers.set("Authorization", `Bearer ${newAccessToken}`);
    originalRequest.headers = headers;
    return apiClient(originalRequest);
  }
);
