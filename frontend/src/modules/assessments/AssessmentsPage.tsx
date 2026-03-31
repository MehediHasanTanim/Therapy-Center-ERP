import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventMountArg } from "@fullcalendar/core";
import { Card } from "../../components/ui/Card";
import { scheduleService } from "../../services/scheduleService";
import { billingService } from "../../services/billingService";
import { patientService } from "../../services/patientService";
import { therapistService } from "../../services/therapistService";
import { formatDateTime } from "../../utils/format";
import { SessionEvent } from "../../types";

const toIsoDate = (value: string) => new Date(value).toISOString().slice(0, 10);

export function AssessmentsPage() {
  const queryClient = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: scheduleService.list });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const { data: therapists } = useQuery({ queryKey: ["therapists"], queryFn: () => therapistService.list() });
  const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: billingService.list });

  const today = useMemo(() => new Date(), []);
  const toInputDate = (value: Date) => value.toISOString().slice(0, 10);
  const defaultMonthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const defaultMonthEnd = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 0), [today]);
  const [rangeStart, setRangeStart] = useState(toInputDate(defaultMonthStart));
  const [rangeEnd, setRangeEnd] = useState(toInputDate(defaultMonthEnd));
  const [draftRangeStart, setDraftRangeStart] = useState(toInputDate(defaultMonthStart));
  const [draftRangeEnd, setDraftRangeEnd] = useState(toInputDate(defaultMonthEnd));
  const [selectedDate, setSelectedDate] = useState("");

  const [selectedSession, setSelectedSession] = useState<SessionEvent | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "120", method: "card" as "cash" | "card" | "online" });

  const assessments = (sessions ?? []).filter((s) => {
    if (s.type !== "assessment") return false;
    if (selectedDate) {
      return toIsoDate(s.startsAt) === selectedDate;
    }
    if (!rangeStart || !rangeEnd) return true;
    const date = s.startsAt.slice(0, 10);
    return date >= rangeStart && date <= rangeEnd;
  });
  const patientById = new Map((patients ?? []).map((item) => [item.id, item.fullName]));
  const therapistById = new Map((therapists ?? []).map((item) => [item.id, item.fullName]));

  const paymentTotalsBySession = useMemo(() => {
    const totals = new Map<string, number>();
    (payments ?? []).forEach((payment) => {
      if (!payment.sessionId) return;
      totals.set(payment.sessionId, (totals.get(payment.sessionId) ?? 0) + payment.amount);
    });
    return totals;
  }, [payments]);

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

  const openPaymentModal = (session: SessionEvent) => {
    setSelectedSession(session);
    setPaymentForm({ amount: "120", method: "card" });
    setShowPaymentModal(true);
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

  const calendarEvents = assessments.map((assessment) => ({
    id: assessment.id,
    title: `${patientById.get(assessment.patientId) ?? "Unknown Patient"} • ${therapistById.get(assessment.therapistId) ?? "Unknown Therapist"}`,
    start: new Date(assessment.startsAt),
    end: new Date(assessment.endsAt),
    extendedProps: {
      hoverDetails: `Patient: ${patientById.get(assessment.patientId) ?? "Unknown Patient"}\nTherapist: ${therapistById.get(assessment.therapistId) ?? "Unknown Therapist"}\nStatus: ${assessment.status}`
    }
  }));

  const onEventDidMount = (arg: EventMountArg) => {
    const details = arg.event.extendedProps.hoverDetails as string | undefined;
    if (!details) return;
    arg.el.setAttribute("title", details);
  };

  return (
    <Card>
      <h2 className="page-title">Assessment Scheduling</h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="local"
        events={calendarEvents}
        eventDidMount={onEventDidMount}
        dateClick={(arg) => setSelectedDate(arg.dateStr)}
        height={520}
      />
      <div className="table-toolbar" style={{ alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "16px" }}>
        <h2 className="page-title">
          Assessment List {selectedDate ? `(${selectedDate})` : `(${rangeStart} to ${rangeEnd})`}
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
      {assessments.length === 0 ? <p>No assessments yet. Create one from Scheduling.</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Patient</th>
            <th>Therapist</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th>Payment Status</th>
            <th>Collected Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((item) => {
            const totalPaid = paymentTotalsBySession.get(item.id) ?? 0;
            const isPaid = totalPaid > 0;
            return (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{patientById.get(item.patientId)}</td>
                <td>{therapistById.get(item.therapistId)}</td>
                <td>{formatDateTime(item.startsAt)}</td>
                <td>{formatDateTime(item.endsAt)}</td>
                <td>
                  <span className="chip">{item.status}</span>
                </td>
                <td>
                  <span className="chip">{isPaid ? "Paid" : "Unpaid"}</span>
                </td>
                <td>{totalPaid > 0 ? `${totalPaid.toFixed(2)}` : "0.00"}</td>
                <td>
                  <button className="btn btn-primary btn-compact" onClick={() => openPaymentModal(item)}>
                    {isPaid ? "Add Payment" : "Collect Payment"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
              <strong>Assessment:</strong> {selectedSession.title}
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
    </Card>
  );
}
