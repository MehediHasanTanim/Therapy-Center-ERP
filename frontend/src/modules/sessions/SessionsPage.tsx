import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { scheduleService } from "../../services/scheduleService";
import { patientService } from "../../services/patientService";
import { therapistService } from "../../services/therapistService";
import { billingService } from "../../services/billingService";
import { formatDateTime } from "../../utils/format";
import { SessionEvent } from "../../types";

const toIsoDate = (value: string) => new Date(value).toISOString().slice(0, 10);

export function SessionsPage() {
  const queryClient = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: scheduleService.list });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const { data: therapists } = useQuery({ queryKey: ["therapists"], queryFn: therapistService.list });
  const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: billingService.list });

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSession, setSelectedSession] = useState<SessionEvent | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "120", method: "card" as "cash" | "card" | "online" });

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
    title: session.title,
    start: session.startsAt,
    end: session.endsAt
  }));

  const visibleSessions = useMemo(() => {
    if (!selectedDate) return sessions ?? [];
    return (sessions ?? []).filter((session) => toIsoDate(session.startsAt) === selectedDate);
  }, [sessions, selectedDate]);

  const paymentMutation = useMutation({
    mutationFn: billingService.create,
    onSuccess: () => {
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Unable to collect payment")
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

  return (
    <div className="grid">
      <Card>
        <h2 className="page-title">Select Date</h2>
        <p className="section-subtitle">Pick a date from calendar to review and bill sessions quickly.</p>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          dateClick={(arg) => setSelectedDate(arg.dateStr)}
          height={520}
        />
      </Card>

      <Card>
        <div className="table-toolbar">
          <h2 className="page-title">Session List {selectedDate ? `(${selectedDate})` : "(All Dates)"}</h2>
          {selectedDate ? (
            <button className="icon-btn" onClick={() => setSelectedDate("")}>
              Clear Date Filter
            </button>
          ) : null}
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
                  <td>
                    <button className="btn btn-primary btn-compact" onClick={() => openPaymentModal(session)}>
                      {isPaid ? "Add Payment" : "Collect Payment"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleSessions.length === 0 ? (
              <tr>
                <td colSpan={8}>No sessions found for selected date.</td>
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
    </div>
  );
}
