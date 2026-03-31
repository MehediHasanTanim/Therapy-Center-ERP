import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventDropArg, EventMountArg } from "@fullcalendar/core";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { patientService } from "../../services/patientService";
import { scheduleService } from "../../services/scheduleService";
import { therapistService } from "../../services/therapistService";
import { SessionEvent } from "../../types";

const therapyTypeOptions = ["Speech", "Occupational", "Behavioral", "Other"] as const;
const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const localDateTimeToIso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
const localDateTimeStringToIso = (value: string) => new Date(value).toISOString();
const toLocalInputValue = (iso: string) => {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function SchedulingPage() {
  const queryClient = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: scheduleService.list });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const { data: therapists } = useQuery({ queryKey: ["therapists"], queryFn: () => therapistService.list() });

  const [therapistFilter, setTherapistFilter] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null);
  const [editSession, setEditSession] = useState<SessionEvent | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editTimes, setEditTimes] = useState({ startsAt: "", endsAt: "" });
  const [form, setForm] = useState({
    patientId: "",
    therapyType: "Speech" as (typeof therapyTypeOptions)[number],
    therapistId: "",
    title: "",
    startDate: "",
    startTime: "",
    endTime: "",
    type: "therapy" as "therapy" | "assessment",
    repeat: "none" as "none" | "daily" | "weekly" | "monthly" | "weekday" | "custom",
    customFrequency: "weekly" as "daily" | "weekly" | "monthly",
    interval: 1,
    weeklyDays: [] as number[],
    monthlyMode: "dayOfMonth" as "dayOfMonth" | "weekday",
    dayOfMonth: 1,
    weekOfMonth: 1 as 1 | 2 | 3 | 4 | -1,
    weekdayOfMonth: 1,
    rangeType: "endAfter" as "noEnd" | "endAfter" | "endBy",
    endAfterCount: 8,
    endByDate: ""
  });
  const patientById = new Map((patients ?? []).map((p) => [p.id, p.fullName]));
  const therapistById = new Map((therapists ?? []).map((t) => [t.id, t.fullName]));

  const { data: filteredTherapistsByType } = useQuery({
    queryKey: ["therapists", "by-therapy-type", form.therapyType],
    queryFn: () => therapistService.list(form.therapyType)
  });

  useEffect(() => {
    setForm((current) => ({ ...current, therapistId: "" }));
  }, [form.therapyType]);

  useEffect(() => {
    if (!form.startDate) return;
    const startDate = new Date(form.startDate);
    if (Number.isNaN(startDate.getTime())) return;
    const weekday = startDate.getDay();
    const day = startDate.getDate();
    const endBy = new Date(startDate);
    endBy.setDate(endBy.getDate() + 30);
    const weekIndex = Math.ceil(day / 7);
    const lastWeek = day > 21 && day + 7 > new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    setForm((prev) => ({
      ...prev,
      weeklyDays: prev.weeklyDays.length ? prev.weeklyDays : [weekday],
      dayOfMonth: day,
      weekdayOfMonth: weekday,
      weekOfMonth: lastWeek ? -1 : (Math.min(4, weekIndex) as 1 | 2 | 3 | 4),
      endByDate: prev.endByDate || endBy.toISOString().slice(0, 10)
    }));
  }, [form.startDate]);

  const createMutation = useMutation({
    mutationFn: scheduleService.create,
    onSuccess: (data) => {
      const count = data.createdCount ?? 1;
      toast.success(count > 1 ? `${count} sessions scheduled` : "Session scheduled");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowScheduleModal(false);
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

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => scheduleService.remove(sessionId),
    onSuccess: () => {
      toast.success("Session deleted");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? "Delete failed";
      toast.error(msg);
    }
  });

  const filteredSessions = useMemo(
    () => (sessions ?? []).filter((s) => (therapistFilter ? s.therapistId === therapistFilter : true)),
    [sessions, therapistFilter]
  );

  const calendarEvents = filteredSessions.map((session) => ({
    id: session.id,
    title: `${patientById.get(session.patientId) ?? "Unknown Patient"} • ${therapistById.get(session.therapistId) ?? "Unknown Therapist"}`,
    start: new Date(session.startsAt),
    end: new Date(session.endsAt),
    backgroundColor: session.type === "assessment" ? "#f59e0b" : "#0f766e",
    extendedProps: {
      hoverDetails: `Patient: ${patientById.get(session.patientId) ?? "Unknown Patient"}\nTherapist: ${therapistById.get(session.therapistId) ?? "Unknown Therapist"}\nType: ${session.type}\nStatus: ${session.status}`
    }
  }));

  const onEventDidMount = (arg: EventMountArg) => {
    const details = arg.event.extendedProps.hoverDetails as string | undefined;
    if (!details) return;
    arg.el.setAttribute("title", details);
    arg.el.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, sessionId: arg.event.id });
    });
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!form.startDate || !form.startTime || !form.endTime) {
      toast.error("Start date, start time, and end time are required.");
      return;
    }
    const startsAtIso = localDateTimeToIso(form.startDate, form.startTime);
    const endsAtIso = localDateTimeToIso(form.startDate, form.endTime);
    if (new Date(endsAtIso) <= new Date(startsAtIso)) {
      toast.error("End time must be after start time.");
      return;
    }
    let recurrence;

    if (form.repeat !== "none") {
      const repeatType = form.repeat === "custom" ? form.customFrequency : form.repeat;
      let patternType: "daily" | "weekly" | "monthly" = "weekly";
      let daysOfWeek: number[] | undefined;
      let dayOfMonth: number | undefined;
      let weekOfMonth: number | undefined;
      let dayOfWeek: number | undefined;

      if (repeatType === "daily") {
        patternType = "daily";
      } else if (repeatType === "monthly") {
        patternType = "monthly";
      } else if (repeatType === "weekday") {
        patternType = "weekly";
        daysOfWeek = [1, 2, 3, 4, 5];
      } else {
        patternType = form.repeat === "custom" ? form.customFrequency : "weekly";
      }

      if (patternType === "weekly" && !daysOfWeek) {
        daysOfWeek = form.weeklyDays.length ? form.weeklyDays : [new Date(form.startDate).getDay()];
      }

      if (patternType === "monthly") {
        if (form.monthlyMode === "dayOfMonth") {
          dayOfMonth = form.dayOfMonth;
        } else {
          weekOfMonth = form.weekOfMonth;
          dayOfWeek = form.weekdayOfMonth;
        }
      }

      if (form.rangeType === "endBy" && !form.endByDate) {
        toast.error("Select an end date for the recurrence.");
        return;
      }

      const intervalValue = form.repeat === "weekday" ? 1 : form.interval;
      recurrence = {
        pattern: {
          type: patternType,
          interval: intervalValue,
          daysOfWeek,
          dayOfMonth,
          weekOfMonth,
          dayOfWeek
        },
        range: {
          type: form.rangeType,
          count: form.rangeType === "endAfter" ? form.endAfterCount : undefined,
          endDate: form.rangeType === "endBy" ? form.endByDate : undefined
        }
      };
    }

    createMutation.mutate({
      patientId: form.patientId,
      therapistId: form.therapistId,
      therapyType: form.therapyType,
      title: form.title,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      type: form.type,
      recurrence
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

  const onContextEdit = () => {
    if (!contextMenu) return;
    const selected = filteredSessions.find((item) => item.id === contextMenu.sessionId);
    if (!selected) return;
    setEditSession(selected);
    setEditTimes({
      startsAt: toLocalInputValue(selected.startsAt),
      endsAt: toLocalInputValue(selected.endsAt)
    });
    setContextMenu(null);
  };

  const onContextDelete = () => {
    if (!contextMenu) return;
    const selected = filteredSessions.find((item) => item.id === contextMenu.sessionId);
    if (!selected) return;
    const confirmed = window.confirm(`Delete session for ${patientById.get(selected.patientId) ?? "patient"}?`);
    setContextMenu(null);
    if (!confirmed) return;
    deleteMutation.mutate(selected.id);
  };

  const onSubmitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editSession) return;
    rescheduleMutation.mutate(
      {
        sessionId: editSession.id,
        startsAt: localDateTimeStringToIso(editTimes.startsAt),
        endsAt: localDateTimeStringToIso(editTimes.endsAt)
      },
      {
        onSuccess: () => {
          setEditSession(null);
          setEditTimes({ startsAt: "", endsAt: "" });
        }
      }
    );
  };

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <h2 className="page-title">Therapy Scheduling</h2>
          <button className="btn btn-primary btn-compact" onClick={() => setShowScheduleModal(true)}>
            + Schedule Session
          </button>
        </div>
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
          timeZone="local"
          events={calendarEvents}
          eventDidMount={onEventDidMount}
          editable
          eventDrop={onEventDrop}
          height={620}
        />
      </Card>
      {contextMenu ? (
        <div
          className="modal-overlay"
          style={{ background: "transparent" }}
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            className="modal-card"
            style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, width: 180, padding: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="icon-btn" style={{ width: "100%", textAlign: "left" }} onClick={onContextEdit}>
              Edit
            </button>
            <button className="icon-btn" style={{ width: "100%", textAlign: "left", color: "#b42318" }} onClick={onContextDelete}>
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {editSession ? (
        <div className="modal-overlay" onClick={() => setEditSession(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Edit Session Time</h3>
              <button className="icon-btn" onClick={() => setEditSession(null)}>
                ✕
              </button>
            </div>
            <p>
              <strong>Patient:</strong> {patientById.get(editSession.patientId) ?? "Unknown Patient"}
            </p>
            <p>
              <strong>Therapist:</strong> {therapistById.get(editSession.therapistId) ?? "Unknown Therapist"}
            </p>
            <form className="grid" onSubmit={onSubmitEdit}>
              <label>
                Starts At
                <input
                  className="input"
                  type="datetime-local"
                  required
                  value={editTimes.startsAt}
                  onChange={(e) => setEditTimes((prev) => ({ ...prev, startsAt: e.target.value }))}
                />
              </label>
              <label>
                Ends At
                <input
                  className="input"
                  type="datetime-local"
                  required
                  value={editTimes.endsAt}
                  onChange={(e) => setEditTimes((prev) => ({ ...prev, endsAt: e.target.value }))}
                />
              </label>
              <Button disabled={rescheduleMutation.isPending}>
                {rescheduleMutation.isPending ? "Saving..." : "Update Session"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {showScheduleModal ? (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Schedule Session</h3>
              <button className="icon-btn" onClick={() => setShowScheduleModal(false)}>
                ✕
              </button>
            </div>
            <form className="grid grid-2" onSubmit={onCreate}>
              <label>
                Patient
                <select
                  className="select"
                  required
                  value={form.patientId}
                  onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                >
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
                <select
                  className="select"
                  value={form.therapyType}
                  onChange={(e) => setForm((f) => ({ ...f, therapyType: e.target.value as (typeof therapyTypeOptions)[number] }))}
                >
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
                  {(filteredTherapistsByType ?? []).map((t) => (
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
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "therapy" | "assessment" }))}
                >
                  <option value="therapy">Therapy</option>
                  <option value="assessment">Assessment</option>
                </select>
              </label>
              <label>
                Starts on
                <input
                  className="input"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </label>
              <label>
                Start time
                <input
                  className="input"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </label>
              <label>
                End time
                <input
                  className="input"
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </label>
              <label>
                Repeat
                <select
                  className="select"
                  value={form.repeat}
                  onChange={(e) => setForm((f) => ({ ...f, repeat: e.target.value as typeof form.repeat }))}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekday">Every weekday (Mon-Fri)</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {form.repeat !== "none" ? (
                <>
                  {form.repeat === "custom" ? (
                    <label>
                      Custom frequency
                      <select
                        className="select"
                        value={form.customFrequency}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, customFrequency: e.target.value as "daily" | "weekly" | "monthly" }))
                        }
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                  ) : null}
                  <label>
                    Every
                    <input
                      className="input"
                      type="number"
                      min={1}
                      disabled={form.repeat === "weekday"}
                      value={form.interval}
                      onChange={(e) => setForm((f) => ({ ...f, interval: Number(e.target.value) || 1 }))}
                    />
                  </label>
                  {(["weekly", "custom"].includes(form.repeat) && (form.repeat !== "custom" || form.customFrequency === "weekly")) ? (
                    <fieldset className="checkbox-group">
                      <legend>Repeat on</legend>
                      <div className="checkbox-grid">
                        {weekDayLabels.map((label, index) => (
                          <label key={label} className="checkbox-item">
                            <input
                              type="checkbox"
                              checked={form.weeklyDays.includes(index)}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  weeklyDays: e.target.checked
                                    ? [...f.weeklyDays, index]
                                    : f.weeklyDays.filter((day) => day !== index)
                                }))
                              }
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                  {((form.repeat === "monthly") || (form.repeat === "custom" && form.customFrequency === "monthly")) ? (
                    <>
                      <label>
                        Monthly pattern
                        <select
                          className="select"
                          value={form.monthlyMode}
                          onChange={(e) => setForm((f) => ({ ...f, monthlyMode: e.target.value as "dayOfMonth" | "weekday" }))}
                        >
                          <option value="dayOfMonth">On day {form.dayOfMonth}</option>
                          <option value="weekday">On the {form.weekOfMonth === -1 ? "last" : form.weekOfMonth} {weekDayLabels[form.weekdayOfMonth]}</option>
                        </select>
                      </label>
                      {form.monthlyMode === "dayOfMonth" ? (
                        <label>
                          Day of month
                          <input
                            className="input"
                            type="number"
                            min={1}
                            max={31}
                            value={form.dayOfMonth}
                            onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: Number(e.target.value) || 1 }))}
                          />
                        </label>
                      ) : (
                        <>
                          <label>
                            Week
                            <select
                              className="select"
                              value={form.weekOfMonth}
                              onChange={(e) => setForm((f) => ({ ...f, weekOfMonth: Number(e.target.value) as 1 | 2 | 3 | 4 | -1 }))}
                            >
                              <option value={1}>First</option>
                              <option value={2}>Second</option>
                              <option value={3}>Third</option>
                              <option value={4}>Fourth</option>
                              <option value={-1}>Last</option>
                            </select>
                          </label>
                          <label>
                            Weekday
                            <select
                              className="select"
                              value={form.weekdayOfMonth}
                              onChange={(e) => setForm((f) => ({ ...f, weekdayOfMonth: Number(e.target.value) }))}
                            >
                              {weekDayLabels.map((label, index) => (
                                <option value={index} key={label}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                    </>
                  ) : null}
                  <fieldset className="checkbox-group">
                    <legend>Ends</legend>
                    <div className="grid" style={{ gap: "8px" }}>
                      <label className="checkbox-item">
                        <input
                          type="radio"
                          checked={form.rangeType === "noEnd"}
                          onChange={() => setForm((f) => ({ ...f, rangeType: "noEnd" }))}
                        />
                        <span>No end</span>
                      </label>
                      <label className="checkbox-item">
                        <input
                          type="radio"
                          checked={form.rangeType === "endAfter"}
                          onChange={() => setForm((f) => ({ ...f, rangeType: "endAfter" }))}
                        />
                        <span>End after</span>
                      </label>
                      {form.rangeType === "endAfter" ? (
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={365}
                          value={form.endAfterCount}
                          onChange={(e) => setForm((f) => ({ ...f, endAfterCount: Number(e.target.value) || 1 }))}
                        />
                      ) : null}
                      <label className="checkbox-item">
                        <input
                          type="radio"
                          checked={form.rangeType === "endBy"}
                          onChange={() => setForm((f) => ({ ...f, rangeType: "endBy" }))}
                        />
                        <span>End by</span>
                      </label>
                      {form.rangeType === "endBy" ? (
                        <input
                          className="input"
                          type="date"
                          value={form.endByDate}
                          onChange={(e) => setForm((f) => ({ ...f, endByDate: e.target.value }))}
                        />
                      ) : null}
                    </div>
                  </fieldset>
                </>
              ) : null}
              <Button disabled={createMutation.isPending}>{createMutation.isPending ? "Scheduling..." : "Schedule"}</Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
