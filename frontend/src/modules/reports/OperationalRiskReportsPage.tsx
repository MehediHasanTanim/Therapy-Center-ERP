import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { DownloadIcon } from "../../components/ui/DownloadIcon";
import { reportService } from "../../services/reportService";
import { formatDateTime, formatDate } from "../../utils/format";
import { downloadCsv, downloadPdf } from "../../utils/download";

const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

export function OperationalRiskReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [conflictStart, setConflictStart] = useState(toInputDate(today));
  const [conflictEnd, setConflictEnd] = useState(toInputDate(today));
  const [noShowStart, setNoShowStart] = useState(toInputDate(today));
  const [noShowEnd, setNoShowEnd] = useState(toInputDate(today));

  const presetLabel = (start: string, end: string) => {
    const endStr = toInputDate(today);
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
    if (end === endStr && start === last7) return "Last 7 Days";
    if (end === endStr && start === last30) return "Last 30 Days";
    if (end === endStr && start === last90) return "Last 90 Days";
    return "Custom range";
  };

  const presetButtons = (
    setStart: (value: string) => void,
    setEnd: (value: string) => void,
    startValue: string,
    endValue: string
  ) => {
    const endStr = toInputDate(today);
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
    const isActive = (start: string) => startValue === start && endValue === endStr;
    const style = (start: string) =>
      isActive(start)
        ? {
            background: "#e0edff",
            borderColor: "#93c5fd",
            color: "#1d4ed8",
            fontWeight: 600
          }
        : undefined;
    const labelWithIcon = (label: string, start: string) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {label}
        {isActive(start) ? (
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
    return (
      <div className="actions-row" style={{ gap: "6px" }}>
        <button
          className="btn btn-compact"
          type="button"
          style={style(last7)}
          onClick={() => {
            setStart(last7);
            setEnd(endStr);
          }}
        >
          {labelWithIcon("Last 7 Days", last7)}
        </button>
        <button
          className="btn btn-compact"
          type="button"
          style={style(last30)}
          onClick={() => {
            setStart(last30);
            setEnd(endStr);
          }}
        >
          {labelWithIcon("Last 30 Days", last30)}
        </button>
        <button
          className="btn btn-compact"
          type="button"
          style={style(last90)}
          onClick={() => {
            setStart(last90);
            setEnd(endStr);
          }}
        >
          {labelWithIcon("Last 90 Days", last90)}
        </button>
        {isActive(last30) ? null : (
          <button
            className="btn btn-compact"
            type="button"
            onClick={() => {
              setStart(last30);
              setEnd(endStr);
            }}
          >
            Reset
          </button>
        )}
      </div>
    );
  };

  const { data: conflictData } = useQuery({
    queryKey: ["reports", "operational", "conflicts", conflictStart, conflictEnd],
    queryFn: () => reportService.conflictReport(conflictStart, conflictEnd)
  });

  const { data: noShowData } = useQuery({
    queryKey: ["reports", "operational", "no-show", noShowStart, noShowEnd],
    queryFn: () => reportService.noShowCancellationReasons(noShowStart, noShowEnd)
  });

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">Operational Risk Reports</h2>
            <p className="section-subtitle">Conflict detection, no-shows, and cancellation reasons.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <div>
            <h3>Double-Booking / Conflict Report</h3>
            <span
              className="chip"
              style={{
                marginTop: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow:
                  presetLabel(conflictStart, conflictEnd) !== "Custom range"
                    ? "0 0 0 2px rgba(59, 130, 246, 0.18), 0 6px 18px rgba(59, 130, 246, 0.2)"
                    : undefined
              }}
            >
              Active: {presetLabel(conflictStart, conflictEnd)}
              {presetLabel(conflictStart, conflictEnd) === "Custom range" ? (
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
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={conflictStart} onChange={(e) => setConflictStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={conflictEnd} onChange={(e) => setConflictEnd(e.target.value)} />
            </label>
            {presetButtons(setConflictStart, setConflictEnd, conflictStart, conflictEnd)}
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/operational/conflicts",
                  { startDate: conflictStart, endDate: conflictEnd },
                  `conflict-report-${conflictStart}-to-${conflictEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/operational/conflicts",
                  { startDate: conflictStart, endDate: conflictEnd },
                  `conflict-report-${conflictStart}-to-${conflictEnd}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-3">
          <Card>
            <h4>Total Conflicts</h4>
            <p>{conflictData?.summary.totalConflicts ?? 0}</p>
          </Card>
          <Card>
            <h4>Created Conflicts</h4>
            <p>{conflictData?.summary.createdConflicts ?? 0}</p>
          </Card>
          <Card>
            <h4>Attempted Conflicts</h4>
            <p>{conflictData?.summary.attemptedConflicts ?? 0}</p>
          </Card>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Type</th>
              <th>Therapist</th>
              <th>Patient</th>
              <th>Other Patient</th>
              <th>Therapy</th>
              <th>Session Type</th>
              <th>Starts</th>
              <th>Ends</th>
              <th>Conflict Starts</th>
              <th>Conflict Ends</th>
              <th>Reason</th>
              <th>Action</th>
              <th>Logged At</th>
            </tr>
          </thead>
          <tbody>
            {(conflictData?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.conflictType}</td>
                <td>{item.therapistName}</td>
                <td>{item.patientName}</td>
                <td>{item.patientNameOther ?? "-"}</td>
                <td>{item.therapyType}</td>
                <td>{item.type}</td>
                <td>{formatDateTime(item.startsAt)}</td>
                <td>{formatDateTime(item.endsAt)}</td>
                <td>{item.conflictStartsAt ? formatDateTime(item.conflictStartsAt) : "-"}</td>
                <td>{item.conflictEndsAt ? formatDateTime(item.conflictEndsAt) : "-"}</td>
                <td>{item.reason ?? "-"}</td>
                <td>{item.action ?? "-"}</td>
                <td>{item.loggedAt ? formatDateTime(item.loggedAt) : "-"}</td>
              </tr>
            ))}
            {(conflictData?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={13}>No conflicts for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="table-toolbar">
          <div>
            <h3>No-Show & Cancellation Reasons</h3>
            <span
              className="chip"
              style={{
                marginTop: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow:
                  presetLabel(noShowStart, noShowEnd) !== "Custom range"
                    ? "0 0 0 2px rgba(59, 130, 246, 0.18), 0 6px 18px rgba(59, 130, 246, 0.2)"
                    : undefined
              }}
            >
              Active: {presetLabel(noShowStart, noShowEnd)}
              {presetLabel(noShowStart, noShowEnd) === "Custom range" ? (
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
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={noShowStart} onChange={(e) => setNoShowStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={noShowEnd} onChange={(e) => setNoShowEnd(e.target.value)} />
            </label>
            {presetButtons(setNoShowStart, setNoShowEnd, noShowStart, noShowEnd)}
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/operational/no-show-cancellations",
                  { startDate: noShowStart, endDate: noShowEnd },
                  `no-show-cancellation-reasons-${noShowStart}-to-${noShowEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/operational/no-show-cancellations",
                  { startDate: noShowStart, endDate: noShowEnd },
                  `no-show-cancellation-reasons-${noShowStart}-to-${noShowEnd}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-4">
          <Card>
            <h4>Total Cancelled</h4>
            <p>{noShowData?.summary.totalCancelled ?? 0}</p>
          </Card>
          <Card>
            <h4>Total No-Show</h4>
            <p>{noShowData?.summary.totalNoShow ?? 0}</p>
          </Card>
          <Card>
            <h4>Unspecified Cancelled</h4>
            <p>{noShowData?.summary.unspecifiedCancelled ?? 0}</p>
          </Card>
          <Card>
            <h4>Unspecified No-Show</h4>
            <p>{noShowData?.summary.unspecifiedNoShow ?? 0}</p>
          </Card>
        </div>
        <div className="grid grid-2">
          <Card>
            <h4>Top Cancellation Reasons</h4>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {(noShowData?.cancellationReasons ?? []).map((item) => (
                  <tr key={item.reason}>
                    <td>{item.reason}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
                {(noShowData?.cancellationReasons ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={2}>No cancellation reasons captured.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
          <Card>
            <h4>Top No-Show Reasons</h4>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {(noShowData?.noShowReasons ?? []).map((item) => (
                  <tr key={item.reason}>
                    <td>{item.reason}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
                {(noShowData?.noShowReasons ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={2}>No no-show reasons captured.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
        <Card>
          <h4>Trend</h4>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cancelled</th>
                <th>No-Show</th>
              </tr>
            </thead>
            <tbody>
              {(noShowData?.trends ?? []).map((item) => (
                <tr key={item.date}>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.cancelledCount}</td>
                  <td>{item.noShowCount}</td>
                </tr>
              ))}
              {(noShowData?.trends ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3}>No cancellations or no-shows in this range.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </Card>
    </div>
  );
}
