import { Payment, Patient, SessionEvent, Therapist, User } from "../types";

export interface MockDb {
  users: Array<User & { password: string }>;
  patients: Patient[];
  therapists: Therapist[];
  sessions: SessionEvent[];
  payments: Payment[];
  refreshTokens: Record<string, string>;
}

const now = new Date();
const plusHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

export const mockDb: MockDb = {
  users: [],
  patients: [
    {
      id: "p-1",
      fullName: "John Carter",
      parentName: "Michael Carter",
      spectrum: "Autism Spectrum Disorder (ASD)",
      dateOfBirth: "1996-04-12",
      phone: "+1-555-0101",
      address: "102 Lakeview Ave, Boston, MA",
      notes: "Anxiety management",
      createdAt: now.toISOString(),
      documents: []
    },
    {
      id: "p-2",
      fullName: "Emma Lewis",
      parentName: "Olivia Lewis",
      spectrum: "Attention-Deficit/Hyperactivity Disorder (ADHD)",
      dateOfBirth: "1990-11-02",
      phone: "+1-555-0102",
      address: "48 West Pine St, Austin, TX",
      notes: "Speech therapy",
      createdAt: now.toISOString(),
      documents: []
    }
  ],
  therapists: [
    {
      id: "t-1",
      fullName: "Dr. Nina Park",
      specialty: "CBT",
      availability: [
        { dayOfWeek: 1, startHour: "09:00", endHour: "16:00" },
        { dayOfWeek: 3, startHour: "10:00", endHour: "18:00" }
      ]
    },
    {
      id: "t-2",
      fullName: "Dr. Omar Hall",
      specialty: "Occupational Therapy",
      availability: [
        { dayOfWeek: 2, startHour: "08:00", endHour: "14:00" },
        { dayOfWeek: 4, startHour: "08:00", endHour: "14:00" }
      ]
    }
  ],
  sessions: [
    {
      id: "s-1",
      patientId: "p-1",
      therapistId: "t-1",
      title: "Therapy - John Carter",
      startsAt: plusHours(2),
      endsAt: plusHours(3),
      status: "scheduled",
      type: "therapy"
    }
  ],
  payments: [
    { id: "pay-1", patientId: "p-1", sessionId: "s-1", amount: 120, method: "card", createdAt: now.toISOString() }
  ],
  refreshTokens: {}
};

export const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
