import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../modules/dashboard/DashboardPage";
import { LoginPage } from "../modules/auth/LoginPage";
import { ProtectedRoute } from "../modules/auth/ProtectedRoute";
import { PatientsPage } from "../modules/patients/PatientsPage";
import { TherapistsPage } from "../modules/therapists/TherapistsPage";
import { SchedulingPage } from "../modules/scheduling/SchedulingPage";
import { SessionsPage } from "../modules/sessions/SessionsPage";
import { AssessmentsPage } from "../modules/assessments/AssessmentsPage";
import { UsersPage } from "../modules/users/UsersPage";
import { CoreOperationsReportsPage } from "../modules/reports/CoreOperationsReportsPage";
import { QualityClinicalReportsPage } from "../modules/reports/QualityClinicalReportsPage";
import { FinancialReportsPage } from "../modules/reports/FinancialReportsPage";
import { OperationalRiskReportsPage } from "../modules/reports/OperationalRiskReportsPage";
import { ComplianceAuditReportsPage } from "../modules/reports/ComplianceAuditReportsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin", "staff"]} />}>
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/therapists" element={<TherapistsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin"]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="/scheduling" element={<SchedulingPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/assessments" element={<AssessmentsPage />} />
          <Route path="/reports/core-operations" element={<CoreOperationsReportsPage />} />
          <Route path="/reports/quality-clinical" element={<QualityClinicalReportsPage />} />
          <Route path="/reports/financial" element={<FinancialReportsPage />} />
          <Route path="/reports/operational-risk" element={<OperationalRiskReportsPage />} />
          <Route path="/reports/compliance-audit" element={<ComplianceAuditReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
