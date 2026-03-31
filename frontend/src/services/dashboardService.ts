import { apiClient } from "./apiClient";

export interface DashboardStats {
  totalPatients: number;
  totalTherapists: number;
  upcomingSessionsToday: number;
  upcomingSessionsTomorrow: number;
  revenueCurrentMonth: number;
}

export const dashboardService = {
  async getStats() {
    const { data } = await apiClient.get<DashboardStats>("/dashboard/stats");
    return data;
  }
};
