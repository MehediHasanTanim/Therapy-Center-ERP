import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { DownloadIcon } from "../../components/ui/DownloadIcon";
import { reportService } from "../../services/reportService";
import { formatDateTime } from "../../utils/format";
import { downloadCsv, downloadPdf } from "../../utils/download";

const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

export function CoreOperationsReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [scheduleDate, setScheduleDate] = useState(toInputDate(today));
  const [scheduleTherapist, setScheduleTherapist] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState("all");
  const [scheduleType, setScheduleType] = useState("all");
  const [attendanceStart, setAttendanceStart] = useState(toInputDate(today));
  const [attendanceEnd, setAttendanceEnd] = useState(toInputDate(today));
  const [utilStart, setUtilStart] = useState(toInputDate(today));
  const [utilEnd, setUtilEnd] = useState(toInputDate(today));
  const [utilSearch, setUtilSearch] = useState("");
  const [engageStart, setEngageStart] = useState(toInputDate(today));
  const [engageEnd, setEngageEnd] = useState(toInputDate(today));
  const [engageSearch, setEngageSearch] = useState("");

  const { data: scheduleData } = useQuery({
    queryKey: ["reports", "core", "daily-schedule", scheduleDate],
    queryFn: () => reportService.dailySchedule(scheduleDate)
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["reports", "core", "attendance", attendanceStart, attendanceEnd],
    queryFn: () => reportService.attendanceCompletion(attendanceStart, attendanceEnd)
  });

  const { data: utilizationData } = useQuery({
    queryKey: ["reports", "core", "utilization", utilStart, utilEnd],
    queryFn: () => reportService.therapistUtilization(utilStart, utilEnd)
  });

  const { data: engagementData } = useQuery({
    queryKey: ["reports", "core", "engagement", engageStart, engageEnd],
    queryFn: () => reportService.patientEngagement(engageStart, engageEnd)
  });

  const filteredSchedule = useMemo(() => {
    const items = scheduleData?.items ?? [];
    const therapistQuery = scheduleTherapist.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTherapist = therapistQuery ? item.therapistName.toLowerCase().includes(therapistQuery) : true;
      const matchesStatus = scheduleStatus === "all" ? true : item.status === scheduleStatus;
      const matchesType = scheduleType === "all" ? true : item.type === scheduleType;
      return matchesTherapist && matchesStatus && matchesType;
    });
  }, [scheduleData, scheduleTherapist, scheduleStatus, scheduleType]);

  const filteredUtilization = useMemo(() => {
    const items = utilizationData?.items ?? [];
    const query = utilSearch.trim().toLowerCase();
    return query ? items.filter((item) => item.therapistName.toLowerCase().includes(query)) : items;
  }, [utilizationData, utilSearch]);

  const filteredEngagement = useMemo(() => {
    const items = engagementData?.items ?? [];
    const query = engageSearch.trim().toLowerCase();
    return query ? items.filter((item) => item.patientName.toLowerCase().includes(query)) : items;
  }, [engagementData, engageSearch]);

  const statusByTherapy = useMemo(() => {
    const buckets: Record<string, { scheduled: number; completed: number; cancelled: number }> = {};
    filteredSchedule.forEach((item) => {
      const key = item.therapyType || "Unknown";
      if (!buckets[key]) buckets[key] = { scheduled: 0, completed: 0, cancelled: 0 };
      if (item.status === "completed") buckets[key].completed += 1;
      else if (item.status === "cancelled") buckets[key].cancelled += 1;
      else buckets[key].scheduled += 1;
    });
    return Object.entries(buckets)
      .map(([therapyType, counts]) => ({ therapyType, ...counts }))
      .sort((a, b) => a.therapyType.localeCompare(b.therapyType));
  }, [filteredSchedule]);

  const maxStatusCount = Math.max(
    ...statusByTherapy.map((item) => item.scheduled + item.completed + item.cancelled),
    1
  );

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">Core Operations Reports</h2>
            <p className="section-subtitle">Daily schedule, attendance, utilization, and patient engagement.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Daily Schedule Overview</h3>
          <div className="actions-row">
            <label>
              Date
              <input className="input" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </label>
            <label>
              Therapist
              <input
                className="input"
                placeholder="Search therapist"
                value={scheduleTherapist}
                onChange={(e) => setScheduleTherapist(e.target.value)}
              />
            </label>
            <label>
              Status
              <select className="select" value={scheduleStatus} onChange={(e) => setScheduleStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>
              Type
              <select className="select" value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                <option value="all">All</option>
                <option value="therapy">Therapy</option>
                <option value="assessment">Assessment</option>
              </select>
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/core/daily-schedule",
                  { date: scheduleDate },
                  `daily-schedule-${scheduleDate}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/core/daily-schedule",
                  { date: scheduleDate },
                  `daily-schedule-${scheduleDate}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Therapist</th>
              <th>Type</th>
              <th>Therapy Type</th>
              <th>Status</th>
              <th>Starts</th>
              <th>Ends</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedule.map((item) => (
              <tr key={item.id}>
                <td>{item.patientName}</td>
                <td>{item.therapistName}</td>
                <td>{item.type}</td>
                <td>{item.therapyType}</td>
                <td>
                  <span className="chip">{item.status}</span>
                </td>
                <td>{formatDateTime(item.startsAt)}</td>
                <td>{formatDateTime(item.endsAt)}</td>
              </tr>
            ))}
            {filteredSchedule.length === 0 ? (
              <tr>
                <td colSpan={7}>No sessions for the selected date.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div style={{ marginTop: "16px" }}>
          <h4>Schedule Status by Therapy Type</h4>
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
            {statusByTherapy.map((item) => {
              const total = item.scheduled + item.completed + item.cancelled;
              const width = total > 0 ? Math.min((total / maxStatusCount) * 100, 100) : 0;
              const scheduledWidth = total > 0 ? (item.scheduled / total) * 100 * (width / 100) : 0;
              const completedWidth = total > 0 ? (item.completed / total) * 100 * (width / 100) : 0;
              const cancelledWidth = total > 0 ? (item.cancelled / total) * 100 * (width / 100) : 0;
              return (
                <div key={item.therapyType} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "180px" }}>{item.therapyType}</span>
                  <div
                    style={{
                      flex: 1,
                      height: "10px",
                      background: "#e5edf6",
                      borderRadius: "999px",
                      display: "flex",
                      overflow: "hidden"
                    }}
                  >
                    <span style={{ width: `${scheduledWidth}%`, background: "#2563eb" }} />
                    <span style={{ width: `${completedWidth}%`, background: "#16a34a" }} />
                    <span style={{ width: `${cancelledWidth}%`, background: "#f97316" }} />
                  </div>
                  <span>{total}</span>
                </div>
              );
            })}
            {statusByTherapy.length === 0 ? <p>No schedule data for the selected filters.</p> : null}
          </div>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Attendance & Completion Rate</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={attendanceStart} onChange={(e) => setAttendanceStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={attendanceEnd} onChange={(e) => setAttendanceEnd(e.target.value)} />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/core/attendance-completion",
                  { startDate: attendanceStart, endDate: attendanceEnd },
                  `attendance-completion-${attendanceStart}-to-${attendanceEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/core/attendance-completion",
                  { startDate: attendanceStart, endDate: attendanceEnd },
                  `attendance-completion-${attendanceStart}-to-${attendanceEnd}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-2">
          <Card>
            <h4>Total Sessions</h4>
            <p>{attendanceData?.total ?? 0}</p>
          </Card>
          <Card>
            <h4>Completion Rate</h4>
            <p>{attendanceData?.completionRate ?? 0}%</p>
          </Card>
          <Card>
            <h4>Completed</h4>
            <p>{attendanceData?.completed ?? 0}</p>
          </Card>
          <Card>
            <h4>Cancelled</h4>
            <p>{attendanceData?.cancelled ?? 0}</p>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Therapist Utilization</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={utilStart} onChange={(e) => setUtilStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={utilEnd} onChange={(e) => setUtilEnd(e.target.value)} />
            </label>
            <label>
              Therapist
              <input
                className="input"
                placeholder="Search therapist"
                value={utilSearch}
                onChange={(e) => setUtilSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/core/therapist-utilization",
                  { startDate: utilStart, endDate: utilEnd },
                  `therapist-utilization-${utilStart}-to-${utilEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/core/therapist-utilization",
                  { startDate: utilStart, endDate: utilEnd },
                  `therapist-utilization-${utilStart}-to-${utilEnd}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Therapist</th>
              <th>Available Hours</th>
              <th>Booked Hours</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {filteredUtilization.map((item) => (
              <tr key={item.therapistId}>
                <td>{item.therapistName}</td>
                <td>{item.availableHours}</td>
                <td>{item.bookedHours}</td>
                <td>{item.utilizationPercent}%</td>
              </tr>
            ))}
            {filteredUtilization.length === 0 ? (
              <tr>
                <td colSpan={4}>No utilization data for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Patient Engagement</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={engageStart} onChange={(e) => setEngageStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={engageEnd} onChange={(e) => setEngageEnd(e.target.value)} />
            </label>
            <label>
              Patient
              <input
                className="input"
                placeholder="Search patient"
                value={engageSearch}
                onChange={(e) => setEngageSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/core/patient-engagement",
                  { startDate: engageStart, endDate: engageEnd },
                  `patient-engagement-${engageStart}-to-${engageEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/core/patient-engagement",
                  { startDate: engageStart, endDate: engageEnd },
                  `patient-engagement-${engageStart}-to-${engageEnd}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Sessions</th>
              <th>Completed</th>
              <th>Cancelled</th>
              <th>Last Session</th>
              <th>Days Since Last</th>
            </tr>
          </thead>
          <tbody>
            {filteredEngagement.map((item) => (
              <tr key={item.patientId}>
                <td>{item.patientName}</td>
                <td>{item.sessionCount}</td>
                <td>{item.completedCount}</td>
                <td>{item.cancelledCount}</td>
                <td>{item.lastSessionAt ? formatDateTime(item.lastSessionAt) : "-"}</td>
                <td>{item.daysSinceLastSession ?? "-"}</td>
              </tr>
            ))}
            {filteredEngagement.length === 0 ? (
              <tr>
                <td colSpan={6}>No engagement data for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
