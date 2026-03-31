import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventMountArg } from "@fullcalendar/core";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { scheduleService } from "../../services/scheduleService";
import { patientService } from "../../services/patientService";
import { therapistService } from "../../services/therapistService";
import { billingService } from "../../services/billingService";
import { configService } from "../../services/configService";
import { formatDateTime } from "../../utils/format";
import { SessionEvent } from "../../types";

const toIsoDate = (value: string) => new Date(value).toISOString().slice(0, 10);

export function SessionsPage() {
  const queryClient = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: scheduleService.list });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const { data: therapists } = useQuery({ queryKey: ["therapists"], queryFn: () => therapistService.list() });
  const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: billingService.list });
  const { data: appConfig } = useQuery({ queryKey: ["app-config"], queryFn: configService.get });

  const today = useMemo(() => new Date(), []);
  const toInputDate = (value: Date) => value.toISOString().slice(0, 10);
  const defaultMonthStart = useMemo(() => {
    const date = new Date(today.getFullYear(), today.getMonth(), 1);
    return date;
  }, [today]);
  const defaultMonthEnd = useMemo(() => {
    const date = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return date;
  }, [today]);
  const [selectedDate, setSelectedDate] = useState("");
  const [rangeStart, setRangeStart] = useState(toInputDate(defaultMonthStart));
  const [rangeEnd, setRangeEnd] = useState(toInputDate(defaultMonthEnd));
  const [draftRangeStart, setDraftRangeStart] = useState(toInputDate(defaultMonthStart));
  const [draftRangeEnd, setDraftRangeEnd] = useState(toInputDate(defaultMonthEnd));
  const [selectedSession, setSelectedSession] = useState<SessionEvent | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "120", method: "card" as "cash" | "card" | "online" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const fallbackNoShowReason = "No response at door";
  const [statusForm, setStatusForm] = useState({
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
    cancellationReason: "",
    noShowReason: "",
    noShowFlag: false,
    defaultNoShowReason: fallbackNoShowReason,
    cancellationOtherText: "",
    noShowOtherText: ""
  });

  const cancellationReasonOptions = [
    "Family emergency",
    "Patient unwell",
    "Transportation issue",
    "Clinic scheduling issue",
    "Therapist unavailable",
    "Other"
  ];
  const noShowReasonOptions = useMemo(() => {
    const base = [
      "No response at door",
      "Patient did not arrive",
      "Family forgot appointment",
      "No contact",
      "Other"
    ];
    const configValue = appConfig?.defaultNoShowReason?.trim();
    if (configValue && !base.includes(configValue)) {
      return [configValue, ...base];
    }
    return base;
  }, [appConfig?.defaultNoShowReason]);

  const normalizeOther = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { reason: "", other: "" };
    if (trimmed.toLowerCase().startsWith("other:")) {
      return { reason: "Other", other: trimmed.slice(6).trim() };
    }
    if (cancellationReasonOptions.includes(trimmed) || noShowReasonOptions.includes(trimmed)) {
      return { reason: trimmed, other: "" };
    }
    return { reason: "Other", other: trimmed };
  };

  useEffect(() => {
    if (!appConfig?.defaultNoShowReason) return;
    setStatusForm((f) => ({
      ...f,
      defaultNoShowReason: appConfig.defaultNoShowReason
    }));
  }, [appConfig?.defaultNoShowReason]);

  const patientById = new Map((patients ?? []).map((p) => [p.id, p.fullName]));
  const therapistById = new Map((therapists ?? []).map((t) => [t.id, t.fullName]));

  const paymentTotalsBySession = useMemo(() => {
    const totals = new Map<string, number>();
    (payments ?? []).forEach((payment) => {
      if (!payment.sessionId) return;
      totals.set(payment.sessionId, (totals.get(payment.sessionId) ?? 0) + payment.amount);
    });
    return totals;
  }, [payments]);

  const calendarEvents = (sessions ?? []).map((session) => ({
    id: session.id,
    title: `${patientById.get(session.patientId) ?? "Unknown Patient"} • ${therapistById.get(session.therapistId) ?? "Unknown Therapist"}`,
    start: new Date(session.startsAt),
    end: new Date(session.endsAt),
    extendedProps: {
      hoverDetails: `Patient: ${patientById.get(session.patientId) ?? "Unknown Patient"}\nTherapist: ${therapistById.get(session.therapistId) ?? "Unknown Therapist"}\nType: ${session.type}\nStatus: ${session.status}`
    }
  }));

  const onEventDidMount = (arg: EventMountArg) => {
    const details = arg.event.extendedProps.hoverDetails as string | undefined;
    if (!details) return;
    arg.el.setAttribute("title", details);
  };

  const visibleSessions = useMemo(() => {
    const items = sessions ?? [];
    if (selectedDate) {
      return items.filter((session) => toIsoDate(session.startsAt) === selectedDate);
    }
    if (!rangeStart || !rangeEnd) return items;
    return items.filter((session) => {
      const date = toIsoDate(session.startsAt);
      return date >= rangeStart && date <= rangeEnd;
    });
  }, [sessions, selectedDate, rangeStart, rangeEnd]);

  const paymentMutation = useMutation({
    mutationFn: billingService.create,
    onSuccess: () => {
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? "Unable to collect payment")
  });

  const statusMutation = useMutation({
    mutationFn: ({
      sessionId,
      payload
    }: {
      sessionId: string;
      payload: { status: "scheduled" | "completed" | "cancelled"; cancellationReason?: string; noShowReason?: string };
    }) => scheduleService.updateStatus(sessionId, payload),
    onSuccess: () => {
      toast.success("Session status updated");
      setShowStatusModal(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? "Unable to update status")
  });

  const openPaymentModal = (session: SessionEvent) => {
    setSelectedSession(session);
    setPaymentForm({ amount: "120", method: "card" });
    setShowPaymentModal(true);
  };

  const openStatusModal = (session: SessionEvent) => {
    const cancelNormalized = normalizeOther(session.cancellationReason ?? "");
    const noShowNormalized = normalizeOther(session.noShowReason ?? "");
    const defaultReason = appConfig?.defaultNoShowReason ?? fallbackNoShowReason;
    setSelectedSession(session);
    setStatusForm({
      status: session.status,
      cancellationReason: cancelNormalized.reason,
      noShowReason: noShowNormalized.reason,
      noShowFlag: Boolean(session.noShowReason),
      defaultNoShowReason: noShowNormalized.reason || defaultReason,
      cancellationOtherText: cancelNormalized.other,
      noShowOtherText: noShowNormalized.other
    });
    setShowStatusModal(true);
  };

  const onSubmitPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSession) return;

    paymentMutation.mutate({
      patientId: selectedSession.patientId,
      sessionId: selectedSession.id,
      amount: Number(paymentForm.amount),
      method: paymentForm.method
    });
  };

  const onSubmitStatus = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSession) return;
    const cancellationReason =
      statusForm.status === "cancelled"
        ? statusForm.cancellationReason === "Other"
          ? statusForm.cancellationOtherText
            ? `Other: ${statusForm.cancellationOtherText.trim()}`
            : "Other"
          : statusForm.cancellationReason || undefined
        : undefined;
    const noShowReason =
      statusForm.status === "cancelled"
        ? statusForm.noShowReason === "Other"
          ? statusForm.noShowOtherText
            ? `Other: ${statusForm.noShowOtherText.trim()}`
            : "Other"
          : statusForm.noShowReason || undefined
        : undefined;
    statusMutation.mutate({
      sessionId: selectedSession.id,
      payload: {
        status: statusForm.status,
        cancellationReason,
        noShowReason
      }
    });
  };

  return (
    <div className="grid">
      <Card>
        <h2 className="page-title">Select Date</h2>
        <p className="section-subtitle">Pick a date from calendar to review and bill sessions quickly.</p>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          timeZone="local"
          events={calendarEvents}
          eventDidMount={onEventDidMount}
          dateClick={(arg) => setSelectedDate(arg.dateStr)}
          height={520}
        />
      </Card>

      <Card>
        <div className="table-toolbar" style={{ alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <h2 className="page-title">
            Session List {selectedDate ? `(${selectedDate})` : `(${rangeStart} to ${rangeEnd})`}
          </h2>
          <div className="actions-row session-filters">
            {selectedDate ? (
              <button className="icon-btn" onClick={() => setSelectedDate("")}>
                Clear Date Filter
              </button>
            ) : null}
            <button
              className={`btn btn-compact ${rangeStart === toInputDate(defaultMonthStart) && rangeEnd === toInputDate(defaultMonthEnd) && !selectedDate ? "btn-primary" : ""}`}
              type="button"
              onClick={() => {
                const start = toInputDate(defaultMonthStart);
                const end = toInputDate(defaultMonthEnd);
                setRangeStart(start);
                setRangeEnd(end);
                setDraftRangeStart(start);
                setDraftRangeEnd(end);
                setSelectedDate("");
              }}
            >
              Current Month
            </button>
            <label>
              From
              <input
                className="input"
                type="date"
                value={draftRangeStart}
                onChange={(e) => setDraftRangeStart(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                className="input"
                type="date"
                value={draftRangeEnd}
                onChange={(e) => setDraftRangeEnd(e.target.value)}
              />
            </label>
            <button
              className="btn btn-compact btn-primary"
              type="button"
              onClick={() => {
                setRangeStart(draftRangeStart);
                setRangeEnd(draftRangeEnd);
                setSelectedDate("");
              }}
            >
              Apply
            </button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Patient</th>
              <th>Therapist</th>
              <th>Starts</th>
              <th>Ends</th>
              <th>Session Status</th>
              <th>Payment Status</th>
              <th>Collected Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleSessions.map((session) => {
              const totalPaid = paymentTotalsBySession.get(session.id) ?? 0;
              const isPaid = totalPaid > 0;

              return (
                <tr key={session.id}>
                  <td>{session.type}</td>
                  <td>{patientById.get(session.patientId)}</td>
                  <td>{therapistById.get(session.therapistId)}</td>
                  <td>{formatDateTime(session.startsAt)}</td>
                  <td>{formatDateTime(session.endsAt)}</td>
                  <td>
                    <span className="chip">{session.status}</span>
                  </td>
                  <td>
                    <span className="chip">{isPaid ? "Paid" : "Unpaid"}</span>
                  </td>
                  <td>{totalPaid > 0 ? `${totalPaid.toFixed(2)}` : "0.00"}</td>
                  <td>
                    <div className="actions-row">
                      <button className="btn btn-primary btn-compact" onClick={() => openPaymentModal(session)}>
                        {isPaid ? "Add Payment" : "Collect Payment"}
                      </button>
                      <button className="btn btn-compact" onClick={() => openStatusModal(session)}>
                        Update Status
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleSessions.length === 0 ? (
              <tr>
                <td colSpan={9}>No sessions found for selected date.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      {showPaymentModal && selectedSession ? (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Collect Payment</h3>
              <button className="icon-btn" onClick={() => setShowPaymentModal(false)}>
                ✕
              </button>
            </div>

            <p>
              <strong>Patient:</strong> {patientById.get(selectedSession.patientId)}
            </p>
            <p>
              <strong>Session:</strong> {selectedSession.title}
            </p>

            <form className="grid" onSubmit={onSubmitPayment}>
              <label>
                Amount
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </label>
              <label>
                Payment Method
                <select
                  className="select"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value as "cash" | "card" | "online" }))}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                </select>
              </label>
              <button className="btn btn-primary" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? "Saving..." : "Submit Payment"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showStatusModal && selectedSession ? (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Update Session Status</h3>
              <button className="icon-btn" onClick={() => setShowStatusModal(false)}>
                ✕
              </button>
            </div>

            <p>
              <strong>Patient:</strong> {patientById.get(selectedSession.patientId)}
            </p>
            <p>
              <strong>Session:</strong> {selectedSession.title}
            </p>

            <form className="grid" onSubmit={onSubmitStatus}>
              <label>
                Status
                <select
                  className="select"
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm((f) => ({
                      ...f,
                      status: e.target.value as "scheduled" | "completed" | "cancelled"
                    }))
                  }
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              {statusForm.status === "cancelled" ? (
                <>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={statusForm.noShowFlag}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          noShowFlag: e.target.checked,
                          noShowReason: e.target.checked ? f.noShowReason || f.defaultNoShowReason : "",
                          noShowOtherText: e.target.checked ? f.noShowOtherText : ""
                        }))
                      }
                    />
                    <span>No-Show (auto-fill reason)</span>
                  </label>
                  <label>
                    Default No-Show Reason
                    <select
                      className="select"
                      value={statusForm.defaultNoShowReason}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          defaultNoShowReason: e.target.value,
                          noShowReason: f.noShowFlag ? e.target.value : f.noShowReason
                        }))
                      }
                    >
                      {noShowReasonOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cancellation Reason
                    <select
                      className="select"
                      value={statusForm.cancellationReason}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          cancellationReason: e.target.value,
                          cancellationOtherText: e.target.value === "Other" ? f.cancellationOtherText : ""
                        }))
                      }
                    >
                      <option value="">Select reason</option>
                      {cancellationReasonOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  {statusForm.cancellationReason === "Other" ? (
                    <label>
                      Other (specify)
                      <input
                        className="input"
                        value={statusForm.cancellationOtherText}
                        onChange={(e) => setStatusForm((f) => ({ ...f, cancellationOtherText: e.target.value }))}
                        placeholder="Enter cancellation reason"
                      />
                    </label>
                  ) : null}
                  <label>
                    No-Show Reason (Optional)
                    <select
                      className="select"
                      value={statusForm.noShowReason}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          noShowReason: e.target.value,
                          noShowFlag: Boolean(e.target.value),
                          noShowOtherText: e.target.value === "Other" ? f.noShowOtherText : ""
                        }))
                      }
                    >
                      <option value="">Select reason</option>
                      {noShowReasonOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  {statusForm.noShowReason === "Other" ? (
                    <label>
                      Other (specify)
                      <input
                        className="input"
                        value={statusForm.noShowOtherText}
                        onChange={(e) => setStatusForm((f) => ({ ...f, noShowOtherText: e.target.value }))}
                        placeholder="Enter no-show reason"
                      />
                    </label>
                  ) : null}
                </>
              ) : null}
              <button className="btn btn-primary" disabled={statusMutation.isPending}>
                {statusMutation.isPending ? "Saving..." : "Save Status"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
