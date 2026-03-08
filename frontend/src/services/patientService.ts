import { apiClient } from "./apiClient";
import { Patient, PatientDocument } from "../types";

export interface CreatePatientInput {
  fullName: string;
  parentName: string;
  spectrum: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  notes?: string;
}

export interface UpdatePatientInput {
  fullName: string;
  parentName: string;
  spectrum: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  notes?: string;
}

export const patientService = {
  async list() {
    const { data } = await apiClient.get<Patient[]>("/patients/");
    return data;
  },
  async create(payload: CreatePatientInput) {
    const { data } = await apiClient.post<Patient>("/patients/", payload);
    return data;
  },
  async uploadDocument(patientId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<PatientDocument>(`/patients/${patientId}/documents/`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  },
  async removeDocument(patientId: string, documentId: string) {
    await apiClient.delete(`/patients/${patientId}/documents/${documentId}/`);
  },
  async update(patientId: string, payload: UpdatePatientInput) {
    const { data } = await apiClient.put<Patient>(`/patients/${patientId}/`, payload);
    return data;
  },
  async remove(patientId: string) {
    await apiClient.delete(`/patients/${patientId}/`);
  }
};
