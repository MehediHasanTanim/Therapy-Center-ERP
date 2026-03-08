export type Role = "super_admin" | "admin" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Patient {
  id: string;
  fullName: string;
  parentName: string;
  spectrum: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  notes?: string;
  documents: PatientDocument[];
  createdAt: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  fileName: string;
  contentType: string;
  size: number;
  version: number;
  uploadedAt: string;
  fileUrl?: string | null;
}

export interface Therapist {
  id: string;
  fullName: string;
  specialty: string;
  availability: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startHour: string;
  endHour: string;
}

export interface SessionEvent {
  id: string;
  patientId: string;
  therapistId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "completed" | "cancelled";
  type: "therapy" | "assessment";
}

export interface Payment {
  id: string;
  patientId: string;
  sessionId?: string;
  amount: number;
  method: "cash" | "card" | "online";
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ApiError {
  message: string;
  code?: string;
}
