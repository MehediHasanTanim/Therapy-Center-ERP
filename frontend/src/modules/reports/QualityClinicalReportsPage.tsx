import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { DownloadIcon } from "../../components/ui/DownloadIcon";
import { reportService } from "../../services/reportService";
import { formatDateTime } from "../../utils/format";
import { downloadCsv, downloadPdf } from "../../utils/download";

const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

export function QualityClinicalReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [mixStart, setMixStart] = useState(toInputDate(today));
  const [mixEnd, setMixEnd] = useState(toInputDate(today));
  const [mixSearch, setMixSearch] = useState("");

  const [assessmentStart, setAssessmentStart] = useState(toInputDate(today));
  const [assessmentEnd, setAssessmentEnd] = useState(toInputDate(today));
  const [assessmentStatus, setAssessmentStatus] = useState("all");
  const [assessmentSearch, setAssessmentSearch] = useState("");

  const [adherenceStart, setAdherenceStart] = useState(toInputDate(today));
  const [adherenceEnd, setAdherenceEnd] = useState(toInputDate(today));
  const [adherenceSearch, setAdherenceSearch] = useState("");
  const [adherenceFilter, setAdherenceFilter] = useState("all");

  const { data: mixData } = useQuery({
    queryKey: ["reports", "quality", "therapy-mix", mixStart, mixEnd],
    queryFn: () => reportService.therapyTypeDistribution(mixStart, mixEnd)
  });

  const { data: assessmentData } = useQuery({
    queryKey: ["reports", "quality", "assessment-pipeline", assessmentStart, assessmentEnd],
    queryFn: () => reportService.assessmentPipeline(assessmentStart, assessmentEnd)
  });

  const { data: adherenceData } = useQuery({
    queryKey: ["reports", "quality", "care-plan-adherence", adherenceStart, adherenceEnd],
    queryFn: () => reportService.carePlanAdherence(adherenceStart, adherenceEnd)
  });

  const filteredMix = useMemo(() => {
    const items = mixData?.items ?? [];
    const query = mixSearch.trim().toLowerCase();
    return query ? items.filter((item) => item.therapyType.toLowerCase().includes(query)) : items;
  }, [mixData, mixSearch]);

  const filteredAssessment = useMemo(() => {
    const items = assessmentData?.items ?? [];
    const query = assessmentSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = assessmentStatus === "all" ? true : item.status === assessmentStatus;
      const matchesSearch = query
        ? item.patientName.toLowerCase().includes(query) || item.therapistName.toLowerCase().includes(query)
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [assessmentData, assessmentSearch, assessmentStatus]);

  const assessmentByTherapy = useMemo(() => {
    const buckets: Record<string, { scheduled: number; completed: number; cancelled: number }> = {};
    filteredAssessment.forEach((item) => {
      const key = item.therapyType || "Unknown";
      if (!buckets[key]) buckets[key] = { scheduled: 0, completed: 0, cancelled: 0 };
      if (item.status === "completed") buckets[key].completed += 1;
      else if (item.status === "cancelled") buckets[key].cancelled += 1;
      else buckets[key].scheduled += 1;
    });
    return Object.entries(buckets)
      .map(([therapyType, counts]) => ({ therapyType, ...counts }))
      .sort((a, b) => a.therapyType.localeCompare(b.therapyType));
  }, [filteredAssessment]);

  const maxAssessmentCount = Math.max(
    ...assessmentByTherapy.map((item) => item.scheduled + item.completed + item.cancelled),
    1
  );

  const filteredAdherence = useMemo(() => {
    const items = adherenceData?.items ?? [];
    const query = adherenceSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = query ? item.patientName.toLowerCase().includes(query) : true;
      const matchesFilter =
        adherenceFilter === "all"
          ? true
          : adherenceFilter === "on-track"
            ? item.adherencePercent >= 80
            : item.adherencePercent < 80;
      return matchesSearch && matchesFilter;
    });
  }, [adherenceData, adherenceSearch, adherenceFilter]);

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">Quality & Clinical Reports</h2>
            <p className="section-subtitle">Therapy mix, assessment pipeline, and care plan adherence.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Therapy Type Distribution</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={mixStart} onChange={(e) => setMixStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={mixEnd} onChange={(e) => setMixEnd(e.target.value)} />
            </label>
            <label>
              Therapy Type
              <input
                className="input"
                placeholder="Search type"
                value={mixSearch}
                onChange={(e) => setMixSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/quality/therapy-type-distribution",
                  { startDate: mixStart, endDate: mixEnd },
                  `therapy-type-distribution-${mixStart}-to-${mixEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/quality/therapy-type-distribution",
                  { startDate: mixStart, endDate: mixEnd },
                  `therapy-type-distribution-${mixStart}-to-${mixEnd}.pdf`
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
              <th>Therapy Type</th>
              <th>Total</th>
              <th>Completed</th>
              <th>Scheduled</th>
              <th>Cancelled</th>
              <th>Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredMix.map((item) => (
              <tr key={item.therapyType}>
                <td>{item.therapyType}</td>
                <td>{item.total}</td>
                <td>{item.completed}</td>
                <td>{item.scheduled}</td>
                <td>{item.cancelled}</td>
                <td>{item.completionRate}%</td>
              </tr>
            ))}
            {filteredMix.length === 0 ? (
              <tr>
                <td colSpan={6}>No therapy sessions for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Assessment Pipeline</h3>
          <div className="actions-row">
            <label>
              Start
              <input
                className="input"
                type="date"
                value={assessmentStart}
                onChange={(e) => setAssessmentStart(e.target.value)}
              />
            </label>
            <label>
              End
              <input className="input" type="date" value={assessmentEnd} onChange={(e) => setAssessmentEnd(e.target.value)} />
            </label>
            <label>
              Status
              <select className="select" value={assessmentStatus} onChange={(e) => setAssessmentStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>
              Search
              <input
                className="input"
                placeholder="Patient or therapist"
                value={assessmentSearch}
                onChange={(e) => setAssessmentSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/quality/assessment-pipeline",
                  { startDate: assessmentStart, endDate: assessmentEnd },
                  `assessment-pipeline-${assessmentStart}-to-${assessmentEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/quality/assessment-pipeline",
                  { startDate: assessmentStart, endDate: assessmentEnd },
                  `assessment-pipeline-${assessmentStart}-to-${assessmentEnd}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-3">
          <Card>
            <h4>Total Assessments</h4>
            <p>{assessmentData?.summary.total ?? 0}</p>
          </Card>
          <Card>
            <h4>Upcoming</h4>
            <p>{assessmentData?.summary.upcoming ?? 0}</p>
          </Card>
          <Card>
            <h4>Overdue</h4>
            <p>{assessmentData?.summary.overdue ?? 0}</p>
          </Card>
        </div>
        <Card>
          <h4>Assessment Status by Therapy Type</h4>
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
            {assessmentByTherapy.length === 0 ? <p>No assessment data for the selected filters.</p> : null}
          </div>
        </Card>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Therapist</th>
              <th>Therapy Type</th>
              <th>Status</th>
              <th>Starts</th>
              <th>Ends</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssessment.map((item) => (
              <tr key={item.id}>
                <td>{item.patientName}</td>
                <td>{item.therapistName}</td>
                <td>{item.therapyType}</td>
                <td>
                  <span className="chip">{item.status}</span>
                </td>
                <td>{formatDateTime(item.startsAt)}</td>
                <td>{formatDateTime(item.endsAt)}</td>
              </tr>
            ))}
            {filteredAssessment.length === 0 ? (
              <tr>
                <td colSpan={6}>No assessments for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Care Plan Adherence</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={adherenceStart} onChange={(e) => setAdherenceStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={adherenceEnd} onChange={(e) => setAdherenceEnd(e.target.value)} />
            </label>
            <label>
              Patient
              <input
                className="input"
                placeholder="Search patient"
                value={adherenceSearch}
                onChange={(e) => setAdherenceSearch(e.target.value)}
              />
            </label>
            <label>
              Status
              <select className="select" value={adherenceFilter} onChange={(e) => setAdherenceFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="on-track">On Track ({">="}80%)</option>
                <option value="at-risk">At Risk (&lt;80%)</option>
              </select>
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/quality/care-plan-adherence",
                  { startDate: adherenceStart, endDate: adherenceEnd },
                  `care-plan-adherence-${adherenceStart}-to-${adherenceEnd}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/quality/care-plan-adherence",
                  { startDate: adherenceStart, endDate: adherenceEnd },
                  `care-plan-adherence-${adherenceStart}-to-${adherenceEnd}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-3">
          <Card>
            <h4>Total Patients</h4>
            <p>{adherenceData?.summary.totalPatients ?? 0}</p>
          </Card>
          <Card>
            <h4>On Track</h4>
            <p>{adherenceData?.summary.onTrack ?? 0}</p>
          </Card>
          <Card>
            <h4>Overall Adherence</h4>
            <p>{adherenceData?.summary.overallAdherenceRate ?? 0}%</p>
          </Card>
        </div>
        <div className="grid grid-2">
          <Card>
            <h4>At Risk</h4>
            <p>{adherenceData?.summary.atRisk ?? 0}</p>
          </Card>
          <Card>
            <h4>Cancelled Sessions</h4>
            <p>{adherenceData?.summary.totalCancelled ?? 0}</p>
          </Card>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Total Sessions</th>
              <th>Completed</th>
              <th>Cancelled</th>
              <th>Adherence</th>
              <th>Last Session</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdherence.map((item) => (
              <tr key={item.patientId}>
                <td>{item.patientName}</td>
                <td>{item.totalSessions}</td>
                <td>{item.completedSessions}</td>
                <td>{item.cancelledSessions}</td>
                <td>{item.adherencePercent}%</td>
                <td>{item.lastSessionAt ? formatDateTime(item.lastSessionAt) : "-"}</td>
              </tr>
            ))}
            {filteredAdherence.length === 0 ? (
              <tr>
                <td colSpan={6}>No adherence data for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
