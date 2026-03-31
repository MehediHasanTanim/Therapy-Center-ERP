import { apiClient } from "./apiClient";

export interface AppConfig {
  defaultNoShowReason: string;
}

export const configService = {
  async get() {
    const { data } = await apiClient.get<AppConfig>("/config");
    return data;
  }
};
