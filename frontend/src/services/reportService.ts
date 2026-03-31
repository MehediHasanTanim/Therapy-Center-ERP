import { apiClient } from "./apiClient";

export interface DailyScheduleItem {
  id: string;
  title: string;
  patientName: string;
  therapistName: string;
  therapyType: string;
  type: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

export interface AttendanceCompletionReport {
  startDate: string;
  endDate: string;
  total: number;
  completed: number;
  cancelled: number;
  scheduled: number;
  completionRate: number;
}

export interface TherapistUtilizationItem {
  therapistId: string;
  therapistName: string;
  availableHours: number;
  bookedHours: number;
  utilizationPercent: number;
}

export interface PatientEngagementItem {
  patientId: string;
  patientName: string;
  sessionCount: number;
  completedCount: number;
  cancelledCount: number;
  lastSessionAt: string | null;
  daysSinceLastSession: number | null;
}

export interface TherapyTypeDistributionItem {
  therapyType: string;
  total: number;
  completed: number;
  cancelled: number;
  scheduled: number;
  completionRate: number;
}

export interface AssessmentPipelineItem {
  id: string;
  patientName: string;
  therapistName: string;
  therapyType: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

export interface AssessmentPipelineSummary {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  overdue: number;
  upcoming: number;
}

export interface CarePlanAdherenceItem {
  patientId: string;
  patientName: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  lastSessionAt: string | null;
  adherencePercent: number;
}

export interface CarePlanAdherenceSummary {
  totalPatients: number;
  onTrack: number;
  atRisk: number;
  overallAdherenceRate: number;
  totalCancelled: number;
}

export interface RevenueByTherapyTypeItem {
  therapyType: string;
  amount: number;
}

export interface RevenueByTherapyTypeMethodItem {
  therapyType: string;
  methods: Record<string, number>;
}

export interface RevenueByDayItem {
  date: string;
  amount: number;
}

export interface RevenueSummary {
  total: number;
  byMethod: Record<string, number>;
}

export interface PaymentStatusSummary {
  totalSessions: number;
  paidSessions: number;
  unpaidSessions: number;
  totalCollected: number;
}

export interface PaymentStatusItem {
  id: string;
  patientName: string;
  therapistName: string;
  therapyType: string;
  type: string;
  status: string;
  startsAt: string;
  endsAt: string;
  collectedAmount: number;
}

export interface TherapistPayoutItem {
  therapistId: string;
  therapistName: string;
  payoutPercentage: number;
  collectedAmount: number;
  payoutAmount: number;
  paymentCount: number;
  sessionCount: number;
}

export interface ConflictReportItem {
  id: string;
  conflictType: "existing" | "attempted";
  therapistName: string;
  patientName: string;
  patientNameOther?: string;
  therapyType: string;
  type: string;
  startsAt: string;
  endsAt: string;
  conflictStartsAt?: string;
  conflictEndsAt?: string;
  reason?: string;
  action?: string;
  loggedAt?: string;
}

export interface ConflictReportSummary {
  totalConflicts: number;
  createdConflicts: number;
  attemptedConflicts: number;
}

export interface NoShowReasonItem {
  reason: string;
  count: number;
}

export interface NoShowTrendItem {
  date: string;
  cancelledCount: number;
  noShowCount: number;
}

export interface NoShowSummary {
  totalCancelled: number;
  totalNoShow: number;
  unspecifiedCancelled: number;
  unspecifiedNoShow: number;
}

export interface AuditTrailSummaryItem {
  key: string;
  count: number;
}

export interface AuditTrailItem {
  id: string;
  userName: string;
  userEmail: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: string;
  metadata: Record<string, any>;
  patientName: string;
  patientId: string;
  therapistName: string;
  sessionTitle: string;
  paymentMethod: string;
  amount: number | null;
}

export interface DocumentActivitySummaryItem {
  action: string;
  count: number;
}

export interface DocumentActivityItem {
  id: string;
  userName: string;
  userEmail: string;
  patientName: string;
  documentId: string;
  fileName: string;
  version: number;
  action: string;
  createdAt: string;
}

export const reportService = {
  async dailySchedule(date: string) {
    const { data } = await apiClient.get<{ date: string; items: DailyScheduleItem[] }>("/reports/core/daily-schedule", {
      params: { date }
    });
    return data;
  },
  async attendanceCompletion(startDate: string, endDate: string) {
    const { data } = await apiClient.get<AttendanceCompletionReport>("/reports/core/attendance-completion", {
      params: { startDate, endDate }
    });
    return data;
  },
  async therapistUtilization(startDate: string, endDate: string) {
    const { data } = await apiClient.get<{ startDate: string; endDate: string; items: TherapistUtilizationItem[] }>(
      "/reports/core/therapist-utilization",
      { params: { startDate, endDate } }
    );
    return data;
  },
  async patientEngagement(startDate: string, endDate: string) {
    const { data } = await apiClient.get<{ startDate: string; endDate: string; items: PatientEngagementItem[] }>(
      "/reports/core/patient-engagement",
      { params: { startDate, endDate } }
    );
    return data;
  },
  async therapyTypeDistribution(startDate: string, endDate: string) {
    const { data } = await apiClient.get<{ startDate: string; endDate: string; items: TherapyTypeDistributionItem[] }>(
      "/reports/quality/therapy-type-distribution",
      { params: { startDate, endDate } }
    );
    return data;
  },
  async assessmentPipeline(startDate: string, endDate: string) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: AssessmentPipelineSummary;
      items: AssessmentPipelineItem[];
    }>("/reports/quality/assessment-pipeline", { params: { startDate, endDate } });
    return data;
  },
  async carePlanAdherence(startDate: string, endDate: string) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: CarePlanAdherenceSummary;
      items: CarePlanAdherenceItem[];
    }>("/reports/quality/care-plan-adherence", { params: { startDate, endDate } });
    return data;
  },
  async revenueSummary(startDate: string, endDate: string, filters?: { method?: string; therapyType?: string }) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: RevenueSummary;
      byTherapyType: RevenueByTherapyTypeItem[];
      byTherapyTypeMethod: RevenueByTherapyTypeMethodItem[];
      byDay: RevenueByDayItem[];
    }>("/reports/financial/revenue-summary", { params: { startDate, endDate, ...filters } });
    return data;
  },
  async paymentStatus(
    startDate: string,
    endDate: string,
    filters?: { method?: string; therapyType?: string; paymentStatus?: "paid" | "unpaid" }
  ) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: PaymentStatusSummary;
      items: PaymentStatusItem[];
    }>("/reports/financial/payment-status", { params: { startDate, endDate, ...filters } });
    return data;
  },
  async therapistPayouts(startDate: string, endDate: string, filters?: { method?: string; therapyType?: string }) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: { totalCollected: number; totalPayout: number };
      items: TherapistPayoutItem[];
    }>("/reports/financial/therapist-payouts", { params: { startDate, endDate, ...filters } });
    return data;
  },
  async conflictReport(startDate: string, endDate: string) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: ConflictReportSummary;
      items: ConflictReportItem[];
    }>("/reports/operational/conflicts", { params: { startDate, endDate } });
    return data;
  },
  async noShowCancellationReasons(startDate: string, endDate: string) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: NoShowSummary;
      cancellationReasons: NoShowReasonItem[];
      noShowReasons: NoShowReasonItem[];
      trends: NoShowTrendItem[];
    }>("/reports/operational/no-show-cancellations", { params: { startDate, endDate } });
    return data;
  },
  async auditTrail(
    startDate: string,
    endDate: string,
    filters?: {
      userId?: string;
      action?: string;
      entityType?: string;
      search?: string;
      patientId?: string;
      therapistId?: string;
    }
  ) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: AuditTrailSummaryItem[];
      items: AuditTrailItem[];
    }>("/reports/compliance/audit-trail", { params: { startDate, endDate, ...filters } });
    return data;
  },
  async documentActivity(startDate: string, endDate: string, filters?: { patientId?: string; action?: string }) {
    const { data } = await apiClient.get<{
      startDate: string;
      endDate: string;
      summary: DocumentActivitySummaryItem[];
      items: DocumentActivityItem[];
    }>("/reports/compliance/document-activity", { params: { startDate, endDate, ...filters } });
    return data;
  }
};
