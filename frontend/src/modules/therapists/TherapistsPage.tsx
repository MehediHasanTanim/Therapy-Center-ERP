import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ActionIconButton } from "../../components/ui/ActionIconButton";
import { therapistService, TherapistSortKey } from "../../services/therapistService";
import { Therapist } from "../../types";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.detail ?? error?.response?.data?.message ?? fallback;

interface TherapistForm {
  fullName: string;
  specialty: string;
  payoutPercentage: number;
  selectedDays: string[];
  sameTimeForAllDays: boolean;
  commonStartHour: string;
  commonEndHour: string;
  dayTimes: Record<string, { startHour: string; endHour: string }>;
}

type SortKey = TherapistSortKey;

const dayLabels: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat"
};

const specialtyOptions = ["Speech Therapist", "Occupational Therapist", "Behaviroal Therapist", "Other"];

const allDayKeys = Object.keys(dayLabels);

const buildInitialDayTimes = () =>
  allDayKeys.reduce<Record<string, { startHour: string; endHour: string }>>((acc, day) => {
    acc[day] = { startHour: "09:00", endHour: "17:00" };
    return acc;
  }, {});

const emptyForm: TherapistForm = {
  fullName: "",
  specialty: "Speech Therapist",
  payoutPercentage: 70,
  selectedDays: ["1"],
  sameTimeForAllDays: true,
  commonStartHour: "09:00",
  commonEndHour: "17:00",
  dayTimes: buildInitialDayTimes()
};

export function TherapistsPage() {
  const queryClient = useQueryClient();

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [form, setForm] = useState<TherapistForm>(emptyForm);
  const [viewTherapist, setViewTherapist] = useState<Therapist | null>(null);
  const [editTherapist, setEditTherapist] = useState<Therapist | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: therapistPageData } = useQuery({
    queryKey: ["therapists", "paged", currentPage, pageSize, searchQuery, specialtyFilter, sortKey, sortOrder],
    queryFn: () =>
      therapistService.listPaged({
        page: currentPage,
        pageSize,
        search: searchQuery.trim(),
        specialty: specialtyFilter,
        sortBy: sortKey,
        sortOrder
      })
  });
  const paginatedTherapists = therapistPageData?.items ?? [];
  const totalPages = therapistPageData?.totalPages ?? 1;
  const safePage = therapistPageData?.page ?? currentPage;
  const totalTherapists = therapistPageData?.total ?? 0;
  const startIndex = totalTherapists === 0 ? 0 : (safePage - 1) * pageSize;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, specialtyFilter, pageSize, sortKey, sortOrder]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["therapists"] });
    queryClient.invalidateQueries({ queryKey: ["therapists", "paged"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: therapistService.create,
    onSuccess: () => {
      toast.success("Therapist enrolled");
      setForm(emptyForm);
      setShowEnrollModal(false);
      refreshData();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to enroll therapist"))
  });

  const updateMutation = useMutation({
    mutationFn: ({
      therapistId,
      payload
    }: {
      therapistId: string;
      payload: {
        fullName: string;
        specialty: string;
        payoutPercentage: number;
        availability: Array<{ dayOfWeek: number; startHour: string; endHour: string }>;
      };
    }) =>
      therapistService.update(therapistId, payload),
    onSuccess: () => {
      toast.success("Therapist updated");
      setShowEditModal(false);
      setEditTherapist(null);
      refreshData();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to update therapist"))
  });

  const deleteMutation = useMutation({
    mutationFn: (therapistId: string) => therapistService.remove(therapistId),
    onSuccess: () => {
      toast.success("Therapist deleted");
      refreshData();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to delete therapist"))
  });

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortOrder("asc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (form.selectedDays.length === 0) {
      toast.error("Select at least one availability day");
      return;
    }
    createMutation.mutate({
      fullName: form.fullName,
      specialty: form.specialty,
      payoutPercentage: form.payoutPercentage,
      availability: form.selectedDays.map((day) => ({
        dayOfWeek: Number(day),
        startHour: form.sameTimeForAllDays ? form.commonStartHour : form.dayTimes[day].startHour,
        endHour: form.sameTimeForAllDays ? form.commonEndHour : form.dayTimes[day].endHour
      }))
    });
  };

  const onEdit = (therapist: Therapist) => {
    const firstAvailability = therapist.availability[0] ?? { dayOfWeek: 1, startHour: "09:00", endHour: "17:00" };
    const initialDayTimes = buildInitialDayTimes();
    therapist.availability.forEach((slot) => {
      initialDayTimes[String(slot.dayOfWeek)] = { startHour: slot.startHour, endHour: slot.endHour };
    });
    const sameTimeForAllDays = therapist.availability.every(
      (slot) => slot.startHour === firstAvailability.startHour && slot.endHour === firstAvailability.endHour
    );
    setEditTherapist(therapist);
    setForm({
      fullName: therapist.fullName,
      specialty: therapist.specialty,
      payoutPercentage: therapist.payoutPercentage ?? 70,
      selectedDays: therapist.availability.map((slot) => String(slot.dayOfWeek)),
      sameTimeForAllDays,
      commonStartHour: firstAvailability.startHour,
      commonEndHour: firstAvailability.endHour,
      dayTimes: initialDayTimes
    });
    setShowEditModal(true);
  };

  const onDelete = (therapist: Therapist) => {
    const confirmed = window.confirm(`Delete therapist ${therapist.fullName}?`);
    if (!confirmed) return;
    deleteMutation.mutate(therapist.id);
  };

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">Therapist Records</h2>
            <p className="section-subtitle">Maintain therapist profiles, specialties, and availability setup.</p>
          </div>
          <div className="actions-row">
            <Button onClick={() => setShowEnrollModal(true)}>+ Enroll Therapist</Button>
          </div>
        </div>

        <div className="table-filters">
          <label>
            Search
            <input
              className="input"
              placeholder="Search by name or specialty"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label>
            Specialty
            <select className="select" value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
              <option value="all">All</option>
              {specialtyOptions
                .slice()
                .sort((a, b) => a.localeCompare(b))
                .map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
                ))}
            </select>
          </label>
          <label>
            Page Size
            <select className="select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <table className="table table-striped">
          <thead>
            <tr>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("fullName")}>
                  Name {sortIndicator("fullName")}
                </button>
              </th>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("specialty")}>
                  Specialty {sortIndicator("specialty")}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTherapists.map((therapist) => {
              return (
                <tr key={therapist.id}>
                  <td>{therapist.fullName}</td>
                  <td>{therapist.specialty}</td>
                  <td>
                    <div className="icon-actions">
                      <ActionIconButton
                        action="view"
                        aria-label="View therapist"
                        onClick={() => {
                          setViewTherapist(therapist);
                          setShowViewModal(true);
                        }}
                      />
                      <ActionIconButton action="edit" aria-label="Edit therapist" onClick={() => onEdit(therapist)} />
                      <ActionIconButton action="delete" aria-label="Delete therapist" onClick={() => onDelete(therapist)} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedTherapists.length === 0 ? (
              <tr>
                <td colSpan={3}>No therapists found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="pagination-row">
          <p>
            Showing {totalTherapists === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalTherapists)} of {totalTherapists}
          </p>
          <div className="actions-row">
            <button className="icon-btn" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span className="chip">
              Page {safePage} / {totalPages}
            </span>
            <button
              className="icon-btn"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {showEnrollModal ? (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Therapist Enrollment</h3>
              <button className="icon-btn" onClick={() => setShowEnrollModal(false)}>
                ✕
              </button>
            </div>
            <form className="grid" onSubmit={onCreate}>
              <label>
                Full Name
                <input className="input" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </label>
              <label>
                Specialty
                <select className="select" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}>
                  {specialtyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Payout Percentage
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.payoutPercentage}
                  onChange={(e) => setForm((f) => ({ ...f, payoutPercentage: Number(e.target.value) }))}
                />
              </label>
              <fieldset className="checkbox-group">
                <legend>Availability Days</legend>
                <div className="checkbox-grid">
                  {Object.entries(dayLabels).map(([value, label]) => (
                    <label key={value} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={form.selectedDays.includes(value)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            selectedDays: e.target.checked ? [...f.selectedDays, value] : f.selectedDays.filter((d) => d !== value)
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.sameTimeForAllDays}
                  onChange={(e) => setForm((f) => ({ ...f, sameTimeForAllDays: e.target.checked }))}
                />
                <span>Use same time for all selected days</span>
              </label>
              {form.sameTimeForAllDays ? (
                <div className="grid grid-2">
                  <label>
                    Start Hour
                    <input
                      className="input"
                      type="time"
                      value={form.commonStartHour}
                      onChange={(e) => setForm((f) => ({ ...f, commonStartHour: e.target.value }))}
                    />
                  </label>
                  <label>
                    End Hour
                    <input
                      className="input"
                      type="time"
                      value={form.commonEndHour}
                      onChange={(e) => setForm((f) => ({ ...f, commonEndHour: e.target.value }))}
                    />
                  </label>
                </div>
              ) : (
                <div className="grid">
                  {form.selectedDays.map((day) => (
                    <div className="grid grid-2" key={day}>
                      <p>{dayLabels[Number(day)]}</p>
                      <div className="grid grid-2">
                        <label>
                          Start
                          <input
                            className="input"
                            type="time"
                            value={form.dayTimes[day]?.startHour ?? "09:00"}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                dayTimes: {
                                  ...f.dayTimes,
                                  [day]: { ...f.dayTimes[day], startHour: e.target.value }
                                }
                              }))
                            }
                          />
                        </label>
                        <label>
                          End
                          <input
                            className="input"
                            type="time"
                            value={form.dayTimes[day]?.endHour ?? "17:00"}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                dayTimes: {
                                  ...f.dayTimes,
                                  [day]: { ...f.dayTimes[day], endHour: e.target.value }
                                }
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="actions-row">
                <Button disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Enroll Therapist"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showViewModal && viewTherapist ? (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Therapist Details</h3>
              <button className="icon-btn" onClick={() => setShowViewModal(false)}>
                ✕
              </button>
            </div>
            <p>
              <strong>Name:</strong> {viewTherapist.fullName}
            </p>
            <p>
              <strong>Specialty:</strong> {viewTherapist.specialty}
            </p>
            <p>
              <strong>Payout %:</strong> {viewTherapist.payoutPercentage ?? 70}%
            </p>
            <p>
              <strong>Availability:</strong>{" "}
              {viewTherapist.availability.length === 0
                ? "-"
                : viewTherapist.availability.map((slot) => `${dayLabels[slot.dayOfWeek]} ${slot.startHour}-${slot.endHour}`).join(", ")}
            </p>
          </div>
        </div>
      ) : null}

      {showEditModal && editTherapist ? (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Edit Therapist</h3>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>
            <form
              className="grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (form.selectedDays.length === 0) {
                  toast.error("Select at least one availability day");
                  return;
                }
                updateMutation.mutate({
                  therapistId: editTherapist.id,
                  payload: {
                    fullName: form.fullName,
                    specialty: form.specialty,
                    payoutPercentage: form.payoutPercentage,
                    availability: form.selectedDays.map((day) => ({
                      dayOfWeek: Number(day),
                      startHour: form.sameTimeForAllDays ? form.commonStartHour : form.dayTimes[day].startHour,
                      endHour: form.sameTimeForAllDays ? form.commonEndHour : form.dayTimes[day].endHour
                    }))
                  }
                });
              }}
            >
              <label>
                Full Name
                <input className="input" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </label>
              <label>
                Specialty
                <select className="select" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}>
                  {specialtyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Payout Percentage
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.payoutPercentage}
                  onChange={(e) => setForm((f) => ({ ...f, payoutPercentage: Number(e.target.value) }))}
                />
              </label>
              <fieldset className="checkbox-group">
                <legend>Availability Days</legend>
                <div className="checkbox-grid">
                  {Object.entries(dayLabels).map(([value, label]) => (
                    <label key={value} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={form.selectedDays.includes(value)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            selectedDays: e.target.checked ? [...f.selectedDays, value] : f.selectedDays.filter((d) => d !== value)
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.sameTimeForAllDays}
                  onChange={(e) => setForm((f) => ({ ...f, sameTimeForAllDays: e.target.checked }))}
                />
                <span>Use same time for all selected days</span>
              </label>
              {form.sameTimeForAllDays ? (
                <div className="grid grid-2">
                  <label>
                    Start Hour
                    <input
                      className="input"
                      type="time"
                      value={form.commonStartHour}
                      onChange={(e) => setForm((f) => ({ ...f, commonStartHour: e.target.value }))}
                    />
                  </label>
                  <label>
                    End Hour
                    <input
                      className="input"
                      type="time"
                      value={form.commonEndHour}
                      onChange={(e) => setForm((f) => ({ ...f, commonEndHour: e.target.value }))}
                    />
                  </label>
                </div>
              ) : (
                <div className="grid">
                  {form.selectedDays.map((day) => (
                    <div className="grid grid-2" key={day}>
                      <p>{dayLabels[Number(day)]}</p>
                      <div className="grid grid-2">
                        <label>
                          Start
                          <input
                            className="input"
                            type="time"
                            value={form.dayTimes[day]?.startHour ?? "09:00"}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                dayTimes: {
                                  ...f.dayTimes,
                                  [day]: { ...f.dayTimes[day], startHour: e.target.value }
                                }
                              }))
                            }
                          />
                        </label>
                        <label>
                          End
                          <input
                            className="input"
                            type="time"
                            value={form.dayTimes[day]?.endHour ?? "17:00"}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                dayTimes: {
                                  ...f.dayTimes,
                                  [day]: { ...f.dayTimes[day], endHour: e.target.value }
                                }
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="actions-row">
                <Button disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
