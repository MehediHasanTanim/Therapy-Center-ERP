import { apiClient } from "./apiClient";
import { Therapist } from "../types";

export type TherapistSortKey = "fullName" | "specialty" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface CreateTherapistInput {
  fullName: string;
  specialty: string;
  payoutPercentage?: number;
  availability: Array<{ dayOfWeek: number; startHour: string; endHour: string }>;
}

export interface UpdateTherapistInput {
  fullName: string;
  specialty: string;
  payoutPercentage?: number;
  availability: Array<{ dayOfWeek: number; startHour: string; endHour: string }>;
}

export interface TherapistListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  specialty?: string;
  sortBy?: TherapistSortKey;
  sortOrder?: SortOrder;
}

export interface PaginatedTherapists {
  items: Therapist[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const therapistService = {
  async list(therapyType?: "Speech" | "Occupational" | "Behavioral" | "Other") {
    const { data } = await apiClient.get<Therapist[]>("/therapists", {
      params: therapyType ? { therapyType } : undefined
    });
    return data;
  },
  async listPaged(params: TherapistListParams) {
    const { data } = await apiClient.get<PaginatedTherapists>("/therapists", { params });
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
