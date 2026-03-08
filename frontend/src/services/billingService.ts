import { apiClient } from "./apiClient";
import { Payment } from "../types";

export interface CreatePaymentInput {
  patientId: string;
  sessionId?: string;
  amount: number;
  method: "cash" | "card" | "online";
}

export const billingService = {
  async list() {
    const { data } = await apiClient.get<Payment[]>("/payments");
    return data;
  },
  async create(payload: CreatePaymentInput) {
    const { data } = await apiClient.post<Payment>("/payments", payload);
    return data;
  }
};
