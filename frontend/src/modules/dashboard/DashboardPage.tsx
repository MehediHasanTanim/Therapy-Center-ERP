import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { dashboardService } from "../../services/dashboardService";
import { reportService } from "../../services/reportService";
import { formatCurrency } from "../../utils/format";
import { useAuth } from "../auth/AuthContext";

const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

export function DashboardPage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 29);
    return date;
  }, [today]);
  const [draftStart, setDraftStart] = useState(toInputDate(defaultStart));
  const [draftEnd, setDraftEnd] = useState(toInputDate(today));
  const [rangeStart, setRangeStart] = useState(toInputDate(defaultStart));
  const [rangeEnd, setRangeEnd] = useState(toInputDate(today));

  const endStr = toInputDate(today);
  const presets = useMemo(() => {
    const makeStart = (daysBack: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysBack);
      return toInputDate(d);
    };
    return [
      { label: "Last 7 Days", daysBack: 6, start: makeStart(6) },
      { label: "Last 30 Days", daysBack: 29, start: makeStart(29) },
      { label: "Last 90 Days", daysBack: 89, start: makeStart(89) }
    ];
  }, [today]);

  const isPresetActive = (start: string) => draftStart === start && draftEnd === endStr;
  const presetStyle = (start: string) =>
    isPresetActive(start)
      ? {
          background: "#e0edff",
          borderColor: "#93c5fd",
          color: "#1d4ed8",
          fontWeight: 600
        }
      : undefined;

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardService.getStats,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  const { data: assessmentData } = useQuery({
    queryKey: ["dashboard", "quality", rangeStart, rangeEnd],
    queryFn: () => reportService.assessmentPipeline(rangeStart, rangeEnd),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  const { data: revenueData } = useQuery({
    queryKey: ["dashboard", "financial", rangeStart, rangeEnd],
    queryFn: () => reportService.revenueSummary(rangeStart, rangeEnd),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  const assessmentByTherapy = useMemo(() => {
    const items = assessmentData?.items ?? [];
    const buckets: Record<string, { scheduled: number; completed: number; cancelled: number }> = {};
    items.forEach((item) => {
      const key = item.therapyType || "Unknown";
      if (!buckets[key]) buckets[key] = { scheduled: 0, completed: 0, cancelled: 0 };
      if (item.status === "completed") buckets[key].completed += 1;
      else if (item.status === "cancelled") buckets[key].cancelled += 1;
      else buckets[key].scheduled += 1;
    });
    return Object.entries(buckets)
      .map(([therapyType, counts]) => ({ therapyType, ...counts }))
      .sort((a, b) => a.therapyType.localeCompare(b.therapyType));
  }, [assessmentData]);

  const maxAssessmentCount = Math.max(
    ...assessmentByTherapy.map((item) => item.scheduled + item.completed + item.cancelled),
    1
  );

  const revenueByTherapy = useMemo(() => {
    const items = revenueData?.byTherapyTypeMethod ?? [];
    return items.map((item) => {
      const total = Object.values(item.methods).reduce((sum, value) => sum + value, 0);
      return { therapyType: item.therapyType, total, methods: item.methods };
    });
  }, [revenueData]);

  const maxRevenueAmount = Math.max(...revenueByTherapy.map((item) => item.total), 1);
  const methodColors: Record<string, string> = {
    cash: "#2563eb",
    card: "#38bdf8",
    online: "#22c55e"
  };

  return (
    <div>
      <h2 className="page-title">{user?.role.toUpperCase()} Dashboard</h2>
      <div className="grid grid-2">
        <Card>
          <h3>Patients</h3>
          <p>{data?.totalPatients ?? 0}</p>
        </Card>
        <Card>
          <h3>Therapists</h3>
          <p>{data?.totalTherapists ?? 0}</p>
        </Card>
        <Card>
          <h3>Upcoming Sessions</h3>
          <p>Today: {data?.upcomingSessionsToday ?? 0}</p>
          <p>Tomorrow: {data?.upcomingSessionsTomorrow ?? 0}</p>
        </Card>
        <Card>
          <h3>Revenue (This Month)</h3>
          <p>{formatCurrency(data?.revenueCurrentMonth ?? 0)}</p>
        </Card>
      </div>
      <Card>
        <div className="table-toolbar">
          <div>
            <h3>Dashboard Range</h3>
            <p className="section-subtitle">Default is last 30 days. Adjust to refresh quality and financial charts.</p>
            <span
              className="chip"
              style={{
                marginTop: "6px",
                boxShadow:
                  rangeEnd === endStr && presets.some((preset) => preset.start === rangeStart)
                    ? "0 0 0 2px rgba(59, 130, 246, 0.18), 0 6px 18px rgba(59, 130, 246, 0.2)"
                    : undefined
              }}
            >
              {(() => {
                const last7 = presets[0]?.start;
                const last30 = presets[1]?.start;
                const last90 = presets[2]?.start;
                const format = (value: string) =>
                  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
                if (rangeEnd === endStr && rangeStart === last7) return "Active: Last 7 Days";
                if (rangeEnd === endStr && rangeStart === last30) return "Active: Last 30 Days";
                if (rangeEnd === endStr && rangeStart === last90) return "Active: Last 90 Days";
                return `Active: ${format(rangeStart)} – ${format(rangeEnd)}`;
              })()}
            </span>
            <p style={{ marginTop: "6px", fontSize: "0.72rem", color: "#64748b", maxWidth: "320px" }}>
              Active range drives the Quality and Financial summaries below.
            </p>
          </div>
          <div className="actions-row" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <div className="actions-row" style={{ gap: "8px", flexWrap: "wrap" }}>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  className="btn btn-compact"
                  type="button"
                  style={presetStyle(preset.start)}
                  onClick={() => {
                    const end = new Date(today);
                    const start = new Date(today);
                    start.setDate(start.getDate() - preset.daysBack);
                    setDraftStart(toInputDate(start));
                    setDraftEnd(toInputDate(end));
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {preset.label}
                    {isPresetActive(preset.start) ? (
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
                </button>
              ))}
            </div>
            <div
              aria-hidden
              style={{
                width: "1px",
                height: "28px",
                background: "#e2e8f0",
                alignSelf: "stretch"
              }}
            />
            <div className="actions-row session-filters" style={{ gap: "8px", flexWrap: "wrap" }}>
              <label>
                From
                <input className="input" type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
              </label>
              <label>
                To
                <input className="input" type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
              </label>
              <button
                className="btn btn-compact btn-primary"
                type="button"
                onClick={() => {
                  setRangeStart(draftStart);
                  setRangeEnd(draftEnd);
                }}
              >
                Apply
              </button>
              <button
                className="btn btn-compact"
                type="button"
                onClick={() => {
                  const end = toInputDate(today);
                  const start = toInputDate(defaultStart);
                  setDraftStart(start);
                  setDraftEnd(end);
                  setRangeStart(start);
                  setRangeEnd(end);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid grid-2" style={{ marginTop: "24px" }}>
        <Card>
          <h3>Assessment Status by Therapy Type</h3>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px", color: "#1f2a44", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#2563eb" }} />
              scheduled
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#16a34a" }} />
              completed
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#f97316" }} />
              cancelled
            </div>
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            {assessmentByTherapy.map((item) => {
              const total = item.scheduled + item.completed + item.cancelled;
              const width = total > 0 ? Math.min((total / maxAssessmentCount) * 100, 100) : 0;
              const scheduledWidth = total > 0 ? (item.scheduled / total) * 100 * (width / 100) : 0;
              const completedWidth = total > 0 ? (item.completed / total) * 100 * (width / 100) : 0;
              const cancelledWidth = total > 0 ? (item.cancelled / total) * 100 * (width / 100) : 0;
              return (
                <div key={item.therapyType} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "160px" }}>{item.therapyType}</span>
                  <div
                    style={{
                      flex: 1,
                      height: "16px",
                      background: "#e5edf6",
                      borderRadius: "999px",
                      display: "flex",
                      overflow: "hidden"
                    }}
                  >
                    <span
                      style={{
                        width: `${scheduledWidth}%`,
                        background: "#2563eb",
                        color: "#ffffff",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title={`${item.therapyType}: scheduled ${item.scheduled}`}
                    >
                      {item.scheduled > 0 ? item.scheduled : ""}
                    </span>
                    <span
                      style={{
                        width: `${completedWidth}%`,
                        background: "#16a34a",
                        color: "#ffffff",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title={`${item.therapyType}: completed ${item.completed}`}
                    >
                      {item.completed > 0 ? item.completed : ""}
                    </span>
                    <span
                      style={{
                        width: `${cancelledWidth}%`,
                        background: "#f97316",
                        color: "#ffffff",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title={`${item.therapyType}: cancelled ${item.cancelled}`}
                    >
                      {item.cancelled > 0 ? item.cancelled : ""}
                    </span>
                  </div>
                  <span title={`${item.therapyType}: total ${total}`}>{total}</span>
                </div>
              );
            })}
            {assessmentByTherapy.length === 0 ? <p>No assessment data for this month.</p> : null}
          </div>
        </Card>
        <Card>
          <h3>Revenue by Therapy Type (By Method)</h3>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px", color: "#1f2a44", fontSize: "0.85rem" }}>
            {Object.entries(methodColors).map(([method, color]) => (
              <div key={method} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: color }} />
                {method}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            {revenueByTherapy.map((item) => {
              const width = item.total > 0 ? Math.min((item.total / maxRevenueAmount) * 100, 100) : 0;
              const methodEntries = Object.entries(item.methods);
              return (
                <div key={item.therapyType} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "160px" }}>{item.therapyType}</span>
                  <div
                    style={{
                      flex: 1,
                      height: "16px",
                      background: "#e5edf6",
                      borderRadius: "999px",
                      display: "flex",
                      overflow: "hidden"
                    }}
                  >
                    {methodEntries.map(([method, amount]) => {
                      const segmentWidth = item.total > 0 ? (amount / item.total) * 100 * (width / 100) : 0;
                      return (
                        <span
                          key={`${item.therapyType}-${method}`}
                          style={{
                            width: `${segmentWidth}%`,
                            background: methodColors[method] || "#94a3b8",
                            color: "#ffffff",
                            fontSize: "0.7rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          title={`${item.therapyType}: ${method} ${formatCurrency(amount)}`}
                        >
                          {amount > 0 ? formatCurrency(amount) : ""}
                        </span>
                      );
                    })}
                  </div>
                  <span title={`${item.therapyType}: total ${formatCurrency(item.total)}`}>{formatCurrency(item.total)}</span>
                </div>
              );
            })}
            {revenueByTherapy.length === 0 ? <p>No revenue recorded for this month.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
