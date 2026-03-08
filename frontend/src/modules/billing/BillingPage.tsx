import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { billingService } from "../../services/billingService";
import { patientService } from "../../services/patientService";
import { scheduleService } from "../../services/scheduleService";
import { formatCurrency, formatDateTime } from "../../utils/format";

export function BillingPage() {
  const queryClient = useQueryClient();
  const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: billingService.list });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: scheduleService.list });

  const [form, setForm] = useState({ patientId: "", sessionId: "", amount: "120", method: "card" as "cash" | "card" | "online" });

  const mutation = useMutation({
    mutationFn: billingService.create,
    onSuccess: () => {
      toast.success("Payment collected");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      patientId: form.patientId,
      sessionId: form.sessionId || undefined,
      amount: Number(form.amount),
      method: form.method
    });
  };

  return (
    <div className="grid grid-2">
      <Card>
        <h2 className="page-title">Fee Collection</h2>
        <form className="grid" onSubmit={onSubmit}>
          <label>
            Patient
            <select className="select" required value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}>
              <option value="">Select patient</option>
              {(patients ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Session (optional)
            <select className="select" value={form.sessionId} onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}>
              <option value="">No session link</option>
              {(sessions ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input className="input" required type="number" min={1} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </label>
          <label>
            Method
            <select className="select" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as "cash" | "card" | "online" }))}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </label>
          <Button disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Collect Fee"}</Button>
        </form>
      </Card>

      <Card>
        <h3>Payment Audit Trail</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((payment) => (
              <tr key={payment.id}>
                <td>{formatCurrency(payment.amount)}</td>
                <td>{payment.method}</td>
                <td>{formatDateTime(payment.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
