import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { DownloadIcon } from "../../components/ui/DownloadIcon";
import { reportService } from "../../services/reportService";
import { userService } from "../../services/userService";
import { patientService } from "../../services/patientService";
import { therapistService } from "../../services/therapistService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { downloadCsv, downloadPdf } from "../../utils/download";

const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

export function ComplianceAuditReportsPage() {
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 29);
    return date;
  }, [today]);
  const [rangeStart, setRangeStart] = useState(toInputDate(defaultStart));
  const [rangeEnd, setRangeEnd] = useState(toInputDate(today));
  const [auditUserId, setAuditUserId] = useState("all");
  const [auditAction, setAuditAction] = useState("all");
  const [auditEntityType, setAuditEntityType] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditPatientId, setAuditPatientId] = useState("all");
  const [auditTherapistId, setAuditTherapistId] = useState("all");
  const [docPatientId, setDocPatientId] = useState("all");
  const [docAction, setDocAction] = useState("all");

  const { data: users } = useQuery({ queryKey: ["users"], queryFn: userService.list });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const { data: therapists } = useQuery({ queryKey: ["therapists"], queryFn: () => therapistService.list() });

  const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const patientNameById = useMemo(() => new Map((patients ?? []).map((p) => [p.id, p.fullName])), [patients]);
  const therapistNameById = useMemo(() => new Map((therapists ?? []).map((t) => [t.id, t.fullName])), [therapists]);
  const userNameById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u.name])), [users]);

  const auditFilenameSuffix = useMemo(() => {
    const parts = [
      auditUserId === "all" ? null : `user-${slugify(userNameById.get(auditUserId) ?? auditUserId)}`,
      auditAction === "all" ? null : `action-${slugify(auditAction)}`,
      auditEntityType === "all" ? null : `entity-${slugify(auditEntityType)}`,
      auditPatientId === "all" ? null : `patient-${slugify(patientNameById.get(auditPatientId) ?? auditPatientId)}`,
      auditTherapistId === "all" ? null : `therapist-${slugify(therapistNameById.get(auditTherapistId) ?? auditTherapistId)}`
    ].filter(Boolean) as string[];
    return parts.length ? `-${parts.join("-")}` : "";
  }, [auditAction, auditEntityType, auditPatientId, auditTherapistId, auditUserId, patientNameById, therapistNameById, userNameById]);

  const docFilenameSuffix = useMemo(() => {
    const parts = [
      docPatientId === "all" ? null : `patient-${slugify(patientNameById.get(docPatientId) ?? docPatientId)}`,
      docAction === "all" ? null : `action-${slugify(docAction)}`
    ].filter(Boolean) as string[];
    return parts.length ? `-${parts.join("-")}` : "";
  }, [docAction, docPatientId, patientNameById]);

  const endStr = toInputDate(today);
  const presetStarts = useMemo(() => {
    const last7 = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return toInputDate(d);
    })();
    const last30 = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return toInputDate(d);
    })();
    const last90 = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 89);
      return toInputDate(d);
    })();
    return { last7, last30, last90 };
  }, [today]);

  const isPresetActive = (start: string) => rangeStart === start && rangeEnd === endStr;
  const presetStyle = (start: string) =>
    isPresetActive(start)
      ? {
          background: "#e0edff",
          borderColor: "#93c5fd",
          color: "#1d4ed8",
          fontWeight: 600,
          animation: "pulseActive 1.6s ease-in-out infinite"
        }
      : undefined;

  const presetLabelWithIcon = (label: string, start: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      {label}
      {isPresetActive(start) ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <path d="M5 10.5l3 3 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : null}
    </span>
  );

  const { data: auditData } = useQuery({
    queryKey: [
      "reports",
      "compliance",
      "audit",
      rangeStart,
      rangeEnd,
      auditUserId,
      auditAction,
      auditEntityType,
      auditSearch,
      auditPatientId,
      auditTherapistId
    ],
    queryFn: () =>
      reportService.auditTrail(rangeStart, rangeEnd, {
        userId: auditUserId === "all" ? undefined : auditUserId,
        action: auditAction === "all" ? undefined : auditAction,
        entityType: auditEntityType === "all" ? undefined : auditEntityType,
        search: auditSearch.trim() || undefined,
        patientId: auditPatientId === "all" ? undefined : auditPatientId,
        therapistId: auditTherapistId === "all" ? undefined : auditTherapistId
      })
  });

  const { data: docData } = useQuery({
    queryKey: ["reports", "compliance", "document", rangeStart, rangeEnd, docPatientId, docAction],
    queryFn: () =>
      reportService.documentActivity(rangeStart, rangeEnd, {
        patientId: docPatientId === "all" ? undefined : docPatientId,
        action: docAction === "all" ? undefined : docAction
      })
  });

  const presetLabel = useMemo(() => {
    if (rangeEnd === endStr && rangeStart === presetStarts.last7) return "Last 7 Days";
    if (rangeEnd === endStr && rangeStart === presetStarts.last30) return "Last 30 Days";
    if (rangeEnd === endStr && rangeStart === presetStarts.last90) return "Last 90 Days";
    return `Custom range`;
  }, [endStr, presetStarts, rangeEnd, rangeStart]);
  const isCustomRange = presetLabel === "Custom range";

  return (
    <div className="grid">
      <style>{`
        @keyframes pulseActive {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.35); }
          70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">Compliance & Audit Reports</h2>
            <p className="section-subtitle">Audit trail and document activity visibility for compliance reviews.</p>
            <span
              className="chip"
              style={{
                marginTop: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow:
                  presetLabel !== "Custom range"
                    ? "0 0 0 2px rgba(59, 130, 246, 0.18), 0 6px 18px rgba(59, 130, 246, 0.2)"
                    : undefined
              }}
            >
              Active: {presetLabel}
              {isCustomRange ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: "block" }}
                >
                  <path d="M5 10.5l3 3 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : null}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Audit Trail Report</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </label>
            <div className="actions-row" style={{ gap: "6px" }}>
              <button
                className="btn btn-compact"
                type="button"
                style={presetStyle(presetStarts.last7)}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 6);
                  setRangeStart(start.toISOString().slice(0, 10));
                  setRangeEnd(end.toISOString().slice(0, 10));
                }}
              >
                {presetLabelWithIcon("Last 7 Days", presetStarts.last7)}
              </button>
              <button
                className="btn btn-compact"
                type="button"
                style={presetStyle(presetStarts.last30)}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 29);
                  setRangeStart(start.toISOString().slice(0, 10));
                  setRangeEnd(end.toISOString().slice(0, 10));
                }}
              >
                {presetLabelWithIcon("Last 30 Days", presetStarts.last30)}
              </button>
              <button
                className="btn btn-compact"
                type="button"
                style={presetStyle(presetStarts.last90)}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 89);
                  setRangeStart(start.toISOString().slice(0, 10));
                  setRangeEnd(end.toISOString().slice(0, 10));
                }}
              >
                {presetLabelWithIcon("Last 90 Days", presetStarts.last90)}
              </button>
              {isPresetActive(presetStarts.last30) ? null : (
                <button
                  className="btn btn-compact"
                  type="button"
                  onClick={() => {
                    setRangeStart(presetStarts.last30);
                    setRangeEnd(endStr);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
            <label>
              User
              <select className="select" value={auditUserId} onChange={(e) => setAuditUserId(e.target.value)}>
                <option value="all">All</option>
                {(users ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Entity
              <select className="select" value={auditEntityType} onChange={(e) => setAuditEntityType(e.target.value)}>
                <option value="all">All</option>
                <option value="session">Session</option>
                <option value="payment">Payment</option>
              </select>
            </label>
            <label>
              Action
              <select className="select" value={auditAction} onChange={(e) => setAuditAction(e.target.value)}>
                <option value="all">All</option>
                {(auditData?.summary ?? [])
                  .map((item) => item.key.split(":")[1])
                  .filter((value, index, self) => value && self.indexOf(value) === index)
                  .map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Patient
              <select className="select" value={auditPatientId} onChange={(e) => setAuditPatientId(e.target.value)}>
                <option value="all">All</option>
                {(patients ?? []).map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Therapist
              <select className="select" value={auditTherapistId} onChange={(e) => setAuditTherapistId(e.target.value)}>
                <option value="all">All</option>
                {(therapists ?? []).map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Search
              <input
                className="input"
                placeholder="Patient or therapist"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/compliance/audit-trail",
                  {
                    startDate: rangeStart,
                    endDate: rangeEnd,
                    userId: auditUserId === "all" ? undefined : auditUserId,
                    action: auditAction === "all" ? undefined : auditAction,
                    entityType: auditEntityType === "all" ? undefined : auditEntityType,
                    search: auditSearch.trim() || undefined,
                    patientId: auditPatientId === "all" ? undefined : auditPatientId,
                    therapistId: auditTherapistId === "all" ? undefined : auditTherapistId
                  },
                  `audit-trail-${rangeStart}-to-${rangeEnd}${auditFilenameSuffix}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/compliance/audit-trail",
                  {
                    startDate: rangeStart,
                    endDate: rangeEnd,
                    userId: auditUserId === "all" ? undefined : auditUserId,
                    action: auditAction === "all" ? undefined : auditAction,
                    entityType: auditEntityType === "all" ? undefined : auditEntityType,
                    search: auditSearch.trim() || undefined,
                    patientId: auditPatientId === "all" ? undefined : auditPatientId,
                    therapistId: auditTherapistId === "all" ? undefined : auditTherapistId
                  },
                  `audit-trail-${rangeStart}-to-${rangeEnd}${auditFilenameSuffix}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-3">
          {(auditData?.summary ?? []).map((item) => (
            <Card key={item.key}>
              <h4>{item.key}</h4>
              <p>{item.count}</p>
            </Card>
          ))}
          {(auditData?.summary ?? []).length === 0 ? (
            <Card>
              <h4>No audit entries</h4>
              <p>0</p>
            </Card>
          ) : null}
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Patient</th>
              <th>Therapist</th>
              <th>Session Title</th>
              <th>Payment Method</th>
              <th>Amount</th>
              <th>Action</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {(auditData?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.userName}</td>
                <td>{item.userEmail}</td>
                <td>{item.entityType}</td>
                <td>{item.entityId}</td>
                <td>{item.patientName || item.patientId || "-"}</td>
                <td>{item.therapistName || "-"}</td>
                <td>{item.sessionTitle || "-"}</td>
                <td>{item.paymentMethod || "-"}</td>
                <td>{item.amount !== null && item.amount !== undefined ? formatCurrency(item.amount) : "-"}</td>
                <td>{item.action}</td>
                <td>{formatDateTime(item.createdAt)}</td>
              </tr>
            ))}
            {(auditData?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={11}>No audit activity for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Document Activity Report</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </label>
            <div className="actions-row" style={{ gap: "6px" }}>
              <button
                className="btn btn-compact"
                type="button"
                style={presetStyle(presetStarts.last7)}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 6);
                  setRangeStart(start.toISOString().slice(0, 10));
                  setRangeEnd(end.toISOString().slice(0, 10));
                }}
              >
                {presetLabelWithIcon("Last 7 Days", presetStarts.last7)}
              </button>
              <button
                className="btn btn-compact"
                type="button"
                style={presetStyle(presetStarts.last30)}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 29);
                  setRangeStart(start.toISOString().slice(0, 10));
                  setRangeEnd(end.toISOString().slice(0, 10));
                }}
              >
                {presetLabelWithIcon("Last 30 Days", presetStarts.last30)}
              </button>
              <button
                className="btn btn-compact"
                type="button"
                style={presetStyle(presetStarts.last90)}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 89);
                  setRangeStart(start.toISOString().slice(0, 10));
                  setRangeEnd(end.toISOString().slice(0, 10));
                }}
              >
                {presetLabelWithIcon("Last 90 Days", presetStarts.last90)}
              </button>
              {isPresetActive(presetStarts.last30) ? null : (
                <button
                  className="btn btn-compact"
                  type="button"
                  onClick={() => {
                    setRangeStart(presetStarts.last30);
                    setRangeEnd(endStr);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
            <label>
              Patient
              <select className="select" value={docPatientId} onChange={(e) => setDocPatientId(e.target.value)}>
                <option value="all">All</option>
                {(patients ?? []).map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Action
              <select className="select" value={docAction} onChange={(e) => setDocAction(e.target.value)}>
                <option value="all">All</option>
                <option value="uploaded">Uploaded</option>
                <option value="deleted">Deleted</option>
              </select>
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/compliance/document-activity",
                  {
                    startDate: rangeStart,
                    endDate: rangeEnd,
                    patientId: docPatientId === "all" ? undefined : docPatientId,
                    action: docAction === "all" ? undefined : docAction
                  },
                  `document-activity-${rangeStart}-to-${rangeEnd}${docFilenameSuffix}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/compliance/document-activity",
                  {
                    startDate: rangeStart,
                    endDate: rangeEnd,
                    patientId: docPatientId === "all" ? undefined : docPatientId,
                    action: docAction === "all" ? undefined : docAction
                  },
                  `document-activity-${rangeStart}-to-${rangeEnd}${docFilenameSuffix}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-3">
          {(docData?.summary ?? []).map((item) => (
            <Card key={item.action}>
              <h4>{item.action}</h4>
              <p>{item.count}</p>
            </Card>
          ))}
          {(docData?.summary ?? []).length === 0 ? (
            <Card>
              <h4>No document activity</h4>
              <p>0</p>
            </Card>
          ) : null}
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Patient</th>
              <th>Document ID</th>
              <th>File</th>
              <th>Version</th>
              <th>Action</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {(docData?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.userName}</td>
                <td>{item.userEmail}</td>
                <td>{item.patientName}</td>
                <td>{item.documentId}</td>
                <td>{item.fileName}</td>
                <td>{item.version}</td>
                <td>{item.action}</td>
                <td>{formatDateTime(item.createdAt)}</td>
              </tr>
            ))}
            {(docData?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={8}>No document activity for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
