import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventDropArg } from "@fullcalendar/core";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { patientService } from "../../services/patientService";
import { scheduleService } from "../../services/scheduleService";
import { therapistService } from "../../services/therapistService";
import { SessionEvent } from "../../types";

const therapyTypeOptions = ["Speech", "Occupational", "Behavioral", "Other"] as const;

const therapyTypeKeywordMap: Record<(typeof therapyTypeOptions)[number], string[]> = {
  Speech: ["speech"],
  Occupational: ["occupational"],
  Behavioral: ["behavior", "behaviour", "cbt"],
  Other: []
};

export function SchedulingPage() {
  const queryClient = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: scheduleService.list });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const { data: therapists } = useQuery({ queryKey: ["therapists"], queryFn: therapistService.list });

  const [therapistFilter, setTherapistFilter] = useState("");
  const [form, setForm] = useState({
    patientId: "",
    therapyType: "Speech" as (typeof therapyTypeOptions)[number],
    therapistId: "",
    title: "",
    startsAt: "",
    endsAt: "",
    type: "therapy" as "therapy" | "assessment"
  });

  const filteredTherapistsByType = useMemo(() => {
    const selectedType = form.therapyType;
    const list = therapists ?? [];
    const keywords = therapyTypeKeywordMap[selectedType];
    if (selectedType === "Other" || keywords.length === 0) return list;
    return list.filter((therapist) => {
      const specialty = therapist.specialty.toLowerCase();
      return keywords.some((keyword) => specialty.includes(keyword));
    });
  }, [therapists, form.therapyType]);

  useEffect(() => {
    setForm((current) => ({ ...current, therapistId: "" }));
  }, [form.therapyType]);

  const createMutation = useMutation({
    mutationFn: scheduleService.create,
    onSuccess: () => {
      toast.success("Session scheduled");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? "Unable to schedule";
      toast.error(msg);
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ sessionId, startsAt, endsAt }: { sessionId: string; startsAt: string; endsAt: string }) =>
      scheduleService.reschedule(sessionId, startsAt, endsAt),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["sessions"] });
      const previous = queryClient.getQueryData<SessionEvent[]>(["sessions"]);
      queryClient.setQueryData<SessionEvent[]>(["sessions"], (current = []) =>
        current.map((item) =>
          item.id === variables.sessionId ? { ...item, startsAt: variables.startsAt, endsAt: variables.endsAt } : item
        )
      );
      return { previous };
    },
    onError: (error: any, _vars, context) => {
      queryClient.setQueryData(["sessions"], context?.previous ?? []);
      const msg = error?.response?.data?.message ?? "Reschedule failed";
      toast.error(msg);
    },
    onSuccess: () => {
      toast.success("Session rescheduled");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    }
  });

  const filteredSessions = useMemo(
    () => (sessions ?? []).filter((s) => (therapistFilter ? s.therapistId === therapistFilter : true)),
    [sessions, therapistFilter]
  );

  const calendarEvents = filteredSessions.map((session) => ({
    id: session.id,
    title: session.title,
    start: session.startsAt,
    end: session.endsAt,
    backgroundColor: session.type === "assessment" ? "#f59e0b" : "#0f766e"
  }));

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      patientId: form.patientId,
      therapistId: form.therapistId,
      title: form.title,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      type: form.type
    });
  };

  const onEventDrop = (arg: EventDropArg) => {
    const startsAt = arg.event.start?.toISOString();
    const endsAt = arg.event.end?.toISOString() ?? new Date(arg.event.start!.getTime() + 60 * 60 * 1000).toISOString();
    if (!startsAt || !endsAt) {
      arg.revert();
      return;
    }

    rescheduleMutation.mutate(
      { sessionId: arg.event.id, startsAt, endsAt },
      {
        onError: () => arg.revert()
      }
    );
  };

  return (
    <div className="grid">
      <Card>
        <h2 className="page-title">Therapy Scheduling</h2>
        <div className="grid grid-2">
          <label>
            Filter by Therapist
            <select className="select" value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)}>
              <option value="">All therapists</option>
              {(therapists ?? []).map((t) => (
                <option value={t.id} key={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={calendarEvents}
          editable
          eventDrop={onEventDrop}
          height={620}
        />
      </Card>

      <Card>
        <h3>Schedule Session</h3>
        <form className="grid grid-2" onSubmit={onCreate}>
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
            Therapy Type
            <select className="select" value={form.therapyType} onChange={(e) => setForm((f) => ({ ...f, therapyType: e.target.value as (typeof therapyTypeOptions)[number] }))}>
              {therapyTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Therapist
            <select
              className="select"
              required
              value={form.therapistId}
              onChange={(e) => setForm((f) => ({ ...f, therapistId: e.target.value }))}
            >
              <option value="">Select therapist</option>
              {filteredTherapistsByType.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </label>
          <label>
            Type
            <select className="select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "therapy" | "assessment" }))}>
              <option value="therapy">Therapy</option>
              <option value="assessment">Assessment</option>
            </select>
          </label>
          <label>
            Starts At
            <input
              className="input"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
          </label>
          <label>
            Ends At
            <input
              className="input"
              type="datetime-local"
              required
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            />
          </label>
          <Button disabled={createMutation.isPending}>{createMutation.isPending ? "Scheduling..." : "Schedule"}</Button>
        </form>
      </Card>
    </div>
  );
}
