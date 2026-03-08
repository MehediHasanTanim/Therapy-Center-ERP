import { apiClient } from "./apiClient";

export interface DashboardStats {
  totalPatients: number;
  totalTherapists: number;
  upcomingSessions: number;
  totalRevenue: number;
}

export const dashboardService = {
  async getStats() {
    const { data } = await apiClient.get<DashboardStats>("/dashboard/stats");
    return data;
  }
};
