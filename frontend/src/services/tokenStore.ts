import { AuthTokens } from "../types";

const KEY = "therapy_tokens";

export const authTokenStore = {
  getTokens(): AuthTokens | null {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthTokens;
  },
  setTokens(tokens: AuthTokens) {
    localStorage.setItem(KEY, JSON.stringify(tokens));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
  getAccessToken() {
    return this.getTokens()?.accessToken;
  },
  getRefreshToken() {
    return this.getTokens()?.refreshToken;
  }
};
