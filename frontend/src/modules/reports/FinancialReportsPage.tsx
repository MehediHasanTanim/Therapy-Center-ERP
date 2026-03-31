import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { DownloadIcon } from "../../components/ui/DownloadIcon";
import { reportService } from "../../services/reportService";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";
import { downloadCsv, downloadPdf } from "../../utils/download";

const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

export function FinancialReportsPage() {
  const therapyTypeOptions = ["Speech", "Occupational", "Behavioral", "Other"] as const;
  const methodOptions = ["cash", "card", "online"] as const;
  const today = useMemo(() => new Date(), []);
  const [revenueStart, setRevenueStart] = useState(toInputDate(today));
  const [revenueEnd, setRevenueEnd] = useState(toInputDate(today));
  const [therapySearch, setTherapySearch] = useState("");
  const [revenueMethod, setRevenueMethod] = useState("all");
  const [revenueTherapyType, setRevenueTherapyType] = useState("all");

  const [statusStart, setStatusStart] = useState(toInputDate(today));
  const [statusEnd, setStatusEnd] = useState(toInputDate(today));
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusSearch, setStatusSearch] = useState("");
  const [statusMethod, setStatusMethod] = useState("all");
  const [statusTherapyType, setStatusTherapyType] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");

  const [payoutStart, setPayoutStart] = useState(toInputDate(today));
  const [payoutEnd, setPayoutEnd] = useState(toInputDate(today));
  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("all");
  const [payoutTherapyType, setPayoutTherapyType] = useState("all");

  const { data: revenueData } = useQuery({
    queryKey: ["reports", "financial", "revenue-summary", revenueStart, revenueEnd, revenueMethod, revenueTherapyType],
    queryFn: () =>
      reportService.revenueSummary(revenueStart, revenueEnd, {
        method: revenueMethod === "all" ? undefined : revenueMethod,
        therapyType: revenueTherapyType === "all" ? undefined : revenueTherapyType
      })
  });

  const { data: paymentStatusData } = useQuery({
    queryKey: [
      "reports",
      "financial",
      "payment-status",
      statusStart,
      statusEnd,
      statusMethod,
      statusTherapyType,
      paymentStatus
    ],
    queryFn: () =>
      reportService.paymentStatus(statusStart, statusEnd, {
        method: statusMethod === "all" ? undefined : statusMethod,
        therapyType: statusTherapyType === "all" ? undefined : statusTherapyType,
        paymentStatus: paymentStatus === "all" ? undefined : (paymentStatus as "paid" | "unpaid")
      })
  });

  const { data: payoutsData } = useQuery({
    queryKey: ["reports", "financial", "therapist-payouts", payoutStart, payoutEnd, payoutMethod, payoutTherapyType],
    queryFn: () =>
      reportService.therapistPayouts(payoutStart, payoutEnd, {
        method: payoutMethod === "all" ? undefined : payoutMethod,
        therapyType: payoutTherapyType === "all" ? undefined : payoutTherapyType
      })
  });

  const filteredTherapy = useMemo(() => {
    const items = revenueData?.byTherapyType ?? [];
    const query = therapySearch.trim().toLowerCase();
    return query ? items.filter((item) => item.therapyType.toLowerCase().includes(query)) : items;
  }, [revenueData, therapySearch]);

  const filteredTherapyMethods = useMemo(() => {
    const items = revenueData?.byTherapyTypeMethod ?? [];
    const query = therapySearch.trim().toLowerCase();
    return query ? items.filter((item) => item.therapyType.toLowerCase().includes(query)) : items;
  }, [revenueData, therapySearch]);

  const revenueByDay = revenueData?.byDay ?? [];
  const maxTherapyAmount = Math.max(...filteredTherapy.map((item) => item.amount), 1);
  const maxDayAmount = Math.max(...revenueByDay.map((item) => item.amount), 1);
  const linePoints = revenueByDay
    .map((item, index) => {
      const x = revenueByDay.length === 1 ? 0 : (index / (revenueByDay.length - 1)) * 280;
      const y = 100 - (item.amount / maxDayAmount) * 90;
      return `${x},${y}`;
    })
    .join(" ");

  const methodColors: Record<string, string> = {
    cash: "#2563eb",
    card: "#38bdf8",
    online: "#22c55e"
  };
  const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const buildSuffix = (parts: Array<string | null>) => {
    const filtered = parts.filter((part): part is string => Boolean(part));
    return filtered.length > 0 ? `-${filtered.join("-")}` : "";
  };

  const filteredStatus = useMemo(() => {
    const items = paymentStatusData?.items ?? [];
    const query = statusSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;
      const matchesSearch = query
        ? item.patientName.toLowerCase().includes(query) || item.therapistName.toLowerCase().includes(query)
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [paymentStatusData, statusFilter, statusSearch]);

  const statusByTherapy = useMemo(() => {
    const buckets: Record<string, { paid: number; unpaid: number }> = {};
    filteredStatus.forEach((item) => {
      const key = item.therapyType || "Unknown";
      if (!buckets[key]) buckets[key] = { paid: 0, unpaid: 0 };
      if (item.collectedAmount > 0) {
        buckets[key].paid += 1;
      } else {
        buckets[key].unpaid += 1;
      }
    });
    return Object.entries(buckets)
      .map(([therapyType, counts]) => ({ therapyType, ...counts }))
      .sort((a, b) => a.therapyType.localeCompare(b.therapyType));
  }, [filteredStatus]);

  const maxStatusCount = Math.max(
    ...statusByTherapy.map((item) => item.paid + item.unpaid),
    1
  );

  const filteredPayouts = useMemo(() => {
    const items = payoutsData?.items ?? [];
    const query = payoutSearch.trim().toLowerCase();
    return query ? items.filter((item) => item.therapistName.toLowerCase().includes(query)) : items;
  }, [payoutsData, payoutSearch]);

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">Financial Reports</h2>
            <p className="section-subtitle">Revenue summaries, payment status, and therapist payouts.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Revenue Summary</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={revenueStart} onChange={(e) => setRevenueStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={revenueEnd} onChange={(e) => setRevenueEnd(e.target.value)} />
            </label>
            <label>
              Method
              <select className="select" value={revenueMethod} onChange={(e) => setRevenueMethod(e.target.value)}>
                <option value="all">All</option>
                {methodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Therapy Type
              <select className="select" value={revenueTherapyType} onChange={(e) => setRevenueTherapyType(e.target.value)}>
                <option value="all">All</option>
                {therapyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Therapy Type
              <input
                className="input"
                placeholder="Search type"
                value={therapySearch}
                onChange={(e) => setTherapySearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/financial/revenue-summary",
                  {
                    startDate: revenueStart,
                    endDate: revenueEnd,
                    method: revenueMethod === "all" ? undefined : revenueMethod,
                    therapyType: revenueTherapyType === "all" ? undefined : revenueTherapyType
                  },
                  `revenue-summary-${revenueStart}-to-${revenueEnd}${buildSuffix([
                    revenueMethod === "all" ? null : `method-${slugify(revenueMethod)}`,
                    revenueTherapyType === "all" ? null : `therapy-${slugify(revenueTherapyType)}`
                  ])}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/financial/revenue-summary",
                  {
                    startDate: revenueStart,
                    endDate: revenueEnd,
                    method: revenueMethod === "all" ? undefined : revenueMethod,
                    therapyType: revenueTherapyType === "all" ? undefined : revenueTherapyType
                  },
                  `revenue-summary-${revenueStart}-to-${revenueEnd}${buildSuffix([
                    revenueMethod === "all" ? null : `method-${slugify(revenueMethod)}`,
                    revenueTherapyType === "all" ? null : `therapy-${slugify(revenueTherapyType)}`
                  ])}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-4">
          <Card>
            <h4>Total Revenue</h4>
            <p>{formatCurrency(revenueData?.summary.total ?? 0)}</p>
          </Card>
          <Card>
            <h4>Cash</h4>
            <p>{formatCurrency(revenueData?.summary.byMethod.cash ?? 0)}</p>
          </Card>
          <Card>
            <h4>Card</h4>
            <p>{formatCurrency(revenueData?.summary.byMethod.card ?? 0)}</p>
          </Card>
          <Card>
            <h4>Online</h4>
            <p>{formatCurrency(revenueData?.summary.byMethod.online ?? 0)}</p>
          </Card>
        </div>
        <div className="grid grid-2">
          <Card>
            <h4>By Therapy Type</h4>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px", color: "#1f2a44", fontSize: "0.85rem" }}>
              {methodOptions.map((method) => (
                <div key={method} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: methodColors[method] }} />
                  {method}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
              {filteredTherapyMethods.map((item) => {
                const total = Object.values(item.methods).reduce((sum, value) => sum + value, 0);
                const width = total > 0 ? Math.min((total / maxTherapyAmount) * 100, 100) : 0;
                return (
                  <div key={item.therapyType} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ width: "140px" }}>{item.therapyType}</span>
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
                      {methodOptions.map((method) => {
                        const amount = item.methods[method] ?? 0;
                        const segmentWidth = total > 0 ? (amount / total) * 100 * (width / 100) : 0;
                        return (
                          <span
                            key={method}
                            style={{
                              width: `${segmentWidth}%`,
                              background: methodColors[method]
                            }}
                          />
                        );
                      })}
                    </div>
                    <span>{formatCurrency(total)}</span>
                  </div>
                );
              })}
              {filteredTherapyMethods.length === 0 ? <p>No revenue data for the selected filters.</p> : null}
            </div>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Therapy Type</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredTherapy.map((item) => (
                  <tr key={item.therapyType}>
                    <td>{item.therapyType}</td>
                    <td>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {filteredTherapy.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No revenue for the selected range.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
          <Card>
            <h4>By Day</h4>
            <div style={{ padding: "8px 0 16px" }}>
              <svg viewBox="0 0 280 120" width="100%" height="120" role="img" aria-label="Revenue trend">
                <polyline points={linePoints} fill="none" stroke="#2563eb" strokeWidth="3" />
                <line x1="0" y1="100" x2="280" y2="100" stroke="#d7e3f3" strokeWidth="1" />
              </svg>
            </div>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(revenueData?.byDay ?? []).map((item) => (
                  <tr key={item.date}>
                    <td>{formatDate(item.date)}</td>
                    <td>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {(revenueData?.byDay ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={2}>No revenue for the selected range.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Payment Status</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={statusStart} onChange={(e) => setStatusStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={statusEnd} onChange={(e) => setStatusEnd(e.target.value)} />
            </label>
            <label>
              Method
              <select className="select" value={statusMethod} onChange={(e) => setStatusMethod(e.target.value)}>
                <option value="all">All</option>
                {methodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Therapy Type
              <select className="select" value={statusTherapyType} onChange={(e) => setStatusTherapyType(e.target.value)}>
                <option value="all">All</option>
                {therapyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment Status
              <select className="select" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </label>
            <label>
              Session Status
              <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
                value={statusSearch}
                onChange={(e) => setStatusSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/financial/payment-status",
                  {
                    startDate: statusStart,
                    endDate: statusEnd,
                    method: statusMethod === "all" ? undefined : statusMethod,
                    therapyType: statusTherapyType === "all" ? undefined : statusTherapyType,
                    paymentStatus: paymentStatus === "all" ? undefined : paymentStatus
                  },
                  `payment-status-${statusStart}-to-${statusEnd}${buildSuffix([
                    statusMethod === "all" ? null : `method-${slugify(statusMethod)}`,
                    statusTherapyType === "all" ? null : `therapy-${slugify(statusTherapyType)}`,
                    paymentStatus === "all" ? null : `payment-${slugify(paymentStatus)}`
                  ])}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/financial/payment-status",
                  {
                    startDate: statusStart,
                    endDate: statusEnd,
                    method: statusMethod === "all" ? undefined : statusMethod,
                    therapyType: statusTherapyType === "all" ? undefined : statusTherapyType,
                    paymentStatus: paymentStatus === "all" ? undefined : paymentStatus
                  },
                  `payment-status-${statusStart}-to-${statusEnd}${buildSuffix([
                    statusMethod === "all" ? null : `method-${slugify(statusMethod)}`,
                    statusTherapyType === "all" ? null : `therapy-${slugify(statusTherapyType)}`,
                    paymentStatus === "all" ? null : `payment-${slugify(paymentStatus)}`
                  ])}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-4">
          <Card>
            <h4>Total Sessions</h4>
            <p>{paymentStatusData?.summary.totalSessions ?? 0}</p>
          </Card>
          <Card>
            <h4>Paid Sessions</h4>
            <p>{paymentStatusData?.summary.paidSessions ?? 0}</p>
          </Card>
          <Card>
            <h4>Unpaid Sessions</h4>
            <p>{paymentStatusData?.summary.unpaidSessions ?? 0}</p>
          </Card>
          <Card>
            <h4>Total Collected</h4>
            <p>{formatCurrency(paymentStatusData?.summary.totalCollected ?? 0)}</p>
          </Card>
        </div>
        <Card>
          <h4>Paid vs Unpaid by Therapy Type</h4>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px", color: "#1f2a44", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#16a34a" }} />
              paid
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#f97316" }} />
              unpaid
            </div>
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            {statusByTherapy.map((item) => {
              const total = item.paid + item.unpaid;
              const width = total > 0 ? Math.min((total / maxStatusCount) * 100, 100) : 0;
              const paidWidth = total > 0 ? (item.paid / total) * 100 * (width / 100) : 0;
              const unpaidWidth = total > 0 ? (item.unpaid / total) * 100 * (width / 100) : 0;
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
                    <span style={{ width: `${paidWidth}%`, background: "#16a34a" }} />
                    <span style={{ width: `${unpaidWidth}%`, background: "#f97316" }} />
                  </div>
                  <span>{total}</span>
                </div>
              );
            })}
            {statusByTherapy.length === 0 ? <p>No payment status data for the selected filters.</p> : null}
          </div>
        </Card>
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
              <th>Collected</th>
            </tr>
          </thead>
          <tbody>
            {filteredStatus.map((item) => (
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
                <td>{formatCurrency(item.collectedAmount)}</td>
              </tr>
            ))}
            {filteredStatus.length === 0 ? (
              <tr>
                <td colSpan={8}>No sessions for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="table-toolbar">
          <h3>Therapist Payouts</h3>
          <div className="actions-row">
            <label>
              Start
              <input className="input" type="date" value={payoutStart} onChange={(e) => setPayoutStart(e.target.value)} />
            </label>
            <label>
              End
              <input className="input" type="date" value={payoutEnd} onChange={(e) => setPayoutEnd(e.target.value)} />
            </label>
            <label>
              Method
              <select className="select" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
                <option value="all">All</option>
                {methodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Therapy Type
              <select className="select" value={payoutTherapyType} onChange={(e) => setPayoutTherapyType(e.target.value)}>
                <option value="all">All</option>
                {therapyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Therapist
              <input
                className="input"
                placeholder="Search therapist"
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadCsv(
                  "/reports/financial/therapist-payouts",
                  {
                    startDate: payoutStart,
                    endDate: payoutEnd,
                    method: payoutMethod === "all" ? undefined : payoutMethod,
                    therapyType: payoutTherapyType === "all" ? undefined : payoutTherapyType
                  },
                  `therapist-payouts-${payoutStart}-to-${payoutEnd}${buildSuffix([
                    payoutMethod === "all" ? null : `method-${slugify(payoutMethod)}`,
                    payoutTherapyType === "all" ? null : `therapy-${slugify(payoutTherapyType)}`
                  ])}.csv`
                )
              }
            >
              <DownloadIcon /> Export CSV
            </button>
            <button
              className="btn btn-compact btn-primary"
              onClick={() =>
                downloadPdf(
                  "/reports/financial/therapist-payouts",
                  {
                    startDate: payoutStart,
                    endDate: payoutEnd,
                    method: payoutMethod === "all" ? undefined : payoutMethod,
                    therapyType: payoutTherapyType === "all" ? undefined : payoutTherapyType
                  },
                  `therapist-payouts-${payoutStart}-to-${payoutEnd}${buildSuffix([
                    payoutMethod === "all" ? null : `method-${slugify(payoutMethod)}`,
                    payoutTherapyType === "all" ? null : `therapy-${slugify(payoutTherapyType)}`
                  ])}.pdf`
                )
              }
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-3">
          <Card>
            <h4>Total Collected</h4>
            <p>{formatCurrency(payoutsData?.summary.totalCollected ?? 0)}</p>
          </Card>
          <Card>
            <h4>Total Payout</h4>
            <p>{formatCurrency(payoutsData?.summary.totalPayout ?? 0)}</p>
          </Card>
          <Card>
            <h4>Therapists Paid</h4>
            <p>{filteredPayouts.length}</p>
          </Card>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Therapist</th>
              <th>Payout %</th>
              <th>Collected</th>
              <th>Payout Amount</th>
              <th>Payments</th>
              <th>Sessions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayouts.map((item) => (
              <tr key={item.therapistId}>
                <td>{item.therapistName}</td>
                <td>{item.payoutPercentage}%</td>
                <td>{formatCurrency(item.collectedAmount)}</td>
                <td>{formatCurrency(item.payoutAmount)}</td>
                <td>{item.paymentCount}</td>
                <td>{item.sessionCount}</td>
              </tr>
            ))}
            {filteredPayouts.length === 0 ? (
              <tr>
                <td colSpan={6}>No payouts for the selected range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
