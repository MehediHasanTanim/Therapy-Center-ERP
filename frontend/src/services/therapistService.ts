import { apiClient } from "./apiClient";
import { Therapist } from "../types";

export interface CreateTherapistInput {
  fullName: string;
  specialty: string;
  availability: Array<{ dayOfWeek: number; startHour: string; endHour: string }>;
}

export interface UpdateTherapistInput {
  fullName: string;
  specialty: string;
  availability: Array<{ dayOfWeek: number; startHour: string; endHour: string }>;
}

export const therapistService = {
  async list() {
    const { data } = await apiClient.get<Therapist[]>("/therapists");
    return data;
  },
  async create(payload: CreateTherapistInput) {
    const { data } = await apiClient.post<Therapist>("/therapists", payload);
    return data;
  },
  async update(therapistId: string, payload: UpdateTherapistInput) {
    const { data } = await apiClient.patch<Therapist>(`/therapists/${therapistId}`, payload);
    return data;
  },
  async remove(therapistId: string) {
    await apiClient.delete(`/therapists/${therapistId}`);
  }
};
