import { apiClient } from "../../services/apiClient";
import { AuthTokens, User } from "../../types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface ApiLoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export const authService = {
  async login(payload: LoginInput) {
    const { data } = await apiClient.post<ApiLoginResponse>("/auth/login/", payload);
    const normalized: LoginResponse = {
      user: data.user,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + 30 * 60 * 1000
      }
    };
    return normalized;
  }
};
