import { apiClient } from "./apiClient";
import { SessionEvent } from "../types";

export interface CreateSessionInput {
  patientId: string;
  therapistId: string;
  therapyType: "Speech" | "Occupational" | "Behavioral" | "Other";
  title: string;
  startsAt: string;
  endsAt: string;
  type: "therapy" | "assessment";
  recurrence?: {
    pattern: {
      type: "daily" | "weekly" | "monthly";
      interval?: number;
      daysOfWeek?: number[];
      dayOfMonth?: number;
      weekOfMonth?: number;
      dayOfWeek?: number;
    };
    range: {
      type: "noEnd" | "endAfter" | "endBy";
      count?: number;
      endDate?: string;
    };
  };
}

export interface CreateSessionResponse {
  session: SessionEvent;
  createdCount: number;
}

export const scheduleService = {
  async list() {
    const { data } = await apiClient.get<SessionEvent[]>("/sessions");
    return data;
  },
  async create(payload: CreateSessionInput) {
    const { data } = await apiClient.post<CreateSessionResponse>("/sessions", payload);
    return data;
  },
  async reschedule(sessionId: string, startsAt: string, endsAt: string) {
    const { data } = await apiClient.patch<SessionEvent>(`/sessions/${sessionId}/reschedule`, { startsAt, endsAt });
    return data;
  },
  async updateStatus(
    sessionId: string,
    payload: { status: "scheduled" | "completed" | "cancelled"; cancellationReason?: string; noShowReason?: string }
  ) {
    const { data } = await apiClient.patch<SessionEvent>(`/sessions/${sessionId}/status`, payload);
    return data;
  },
  async remove(sessionId: string) {
    await apiClient.delete(`/sessions/${sessionId}`);
  }
};
