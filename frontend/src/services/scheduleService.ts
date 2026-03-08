import { apiClient } from "./apiClient";
import { SessionEvent } from "../types";

export interface CreateSessionInput {
  patientId: string;
  therapistId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  type: "therapy" | "assessment";
}

export const scheduleService = {
  async list() {
    const { data } = await apiClient.get<SessionEvent[]>("/sessions");
    return data;
  },
  async create(payload: CreateSessionInput) {
    const { data } = await apiClient.post<SessionEvent>("/sessions", payload);
    return data;
  },
  async reschedule(sessionId: string, startsAt: string, endsAt: string) {
    const { data } = await apiClient.patch<SessionEvent>(`/sessions/${sessionId}/reschedule`, { startsAt, endsAt });
    return data;
  }
};
