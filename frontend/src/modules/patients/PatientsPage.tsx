import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ActionIconButton } from "../../components/ui/ActionIconButton";
import { patientService } from "../../services/patientService";
import { Patient } from "../../types";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];

const validateFiles = (files: File[]) => {
  if (files.length === 0) return "";
  for (const file of files) {
    if (!allowedTypes.includes(file.type)) return `Only PDF, PNG, JPG files are allowed. (${file.name})`;
    if (file.size > MAX_FILE_SIZE) return `Max file size is 5MB. (${file.name})`;
  }
  return "";
};

interface PatientForm {
  fullName: string;
  parentName: string;
  spectrum: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  notes: string;
}

type SortKey = "fullName" | "parentName" | "spectrum" | "dateOfBirth" | "phone";

const spectrumOptions = [
  "Autism Spectrum Disorder (ASD)",
  "Attention-Deficit/Hyperactivity Disorder (ADHD)",
  "Cerebral Palsy",
  "Down Syndrome",
  "Microcephaly",
  "Intellectual Disability (ID)",
  "Other"
];

const emptyForm: PatientForm = {
  fullName: "",
  parentName: "",
  spectrum: "Autism Spectrum Disorder (ASD)",
  dateOfBirth: "",
  phone: "",
  address: "",
  notes: ""
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function PatientsPage() {
  const queryClient = useQueryClient();
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: patientService.list });
  const allPatients = patients ?? [];

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);

  const [enrollmentDocFiles, setEnrollmentDocFiles] = useState<File[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [spectrumFilter, setSpectrumFilter] = useState("all");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const previewUrl = useMemo(() => {
    const image = uploadFiles.find((file) => file.type.startsWith("image/"));
    if (!image) return "";
    return URL.createObjectURL(image);
  }, [uploadFiles]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, spectrumFilter, pageSize]);

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allPatients.filter((patient) => {
      const matchesSpectrum = spectrumFilter === "all" || patient.spectrum === spectrumFilter;
      if (!query) return matchesSpectrum;
      const searchable = `${patient.fullName} ${patient.parentName} ${patient.phone}`.toLowerCase();
      return matchesSpectrum && searchable.includes(query);
    });
  }, [allPatients, searchQuery, spectrumFilter]);

  const sortedPatients = useMemo(() => {
    const sorted = [...filteredPatients];
    sorted.sort((a, b) => {
      const left = String(a[sortKey] ?? "").toLowerCase();
      const right = String(b[sortKey] ?? "").toLowerCase();
      if (left < right) return sortOrder === "asc" ? -1 : 1;
      if (left > right) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredPatients, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedPatients = sortedPatients.slice(startIndex, startIndex + pageSize);

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

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createPatientMutation = useMutation({
    mutationFn: patientService.create,
    onSuccess: async (created) => {
      if (enrollmentDocFiles.length > 0) {
        await Promise.all(enrollmentDocFiles.map((file) => patientService.uploadDocument(created.id, file)));
      }
      toast.success("Patient enrolled");
      setForm(emptyForm);
      setEnrollmentDocFiles([]);
      setFileError("");
      setShowEnrollModal(false);
      refreshData();
    },
    onError: () => toast.error("Unable to enroll patient")
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ patientId, files }: { patientId: string; files: File[] }) => {
      await Promise.all(files.map((file) => patientService.uploadDocument(patientId, file)));
    },
    onSuccess: () => {
      toast.success("Documents uploaded");
      setUploadFiles([]);
      setFileError("");
      setShowUploadModal(false);
      refreshData();
    },
    onError: () => toast.error("Upload failed")
  });

  const updateMutation = useMutation({
    mutationFn: ({ patientId, payload }: { patientId: string; payload: PatientForm }) => patientService.update(patientId, payload),
    onSuccess: () => {
      toast.success("Patient updated");
      setShowEditModal(false);
      setEditPatient(null);
      refreshData();
    },
    onError: () => toast.error("Unable to update patient")
  });

  const deleteMutation = useMutation({
    mutationFn: (patientId: string) => patientService.remove(patientId),
    onSuccess: () => {
      toast.success("Patient deleted");
      refreshData();
    },
    onError: () => toast.error("Unable to delete patient")
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: ({ patientId, documentId }: { patientId: string; documentId: string }) => patientService.removeDocument(patientId, documentId),
    onSuccess: async (_, variables) => {
      toast.success("Document deleted");
      await refreshData();
      if (showViewModal && viewPatient && viewPatient.id === variables.patientId) {
        const updatedPatients = await queryClient.fetchQuery({ queryKey: ["patients"], queryFn: patientService.list });
        const latest = updatedPatients.find((item) => item.id === variables.patientId) ?? null;
        setViewPatient(latest);
      }
    },
    onError: () => toast.error("Unable to delete document")
  });

  const onEnrollmentDocChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    const error = validateFiles(picked);
    setFileError(error);
    setEnrollmentDocFiles(error ? [] : picked);
  };

  const onUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    const error = validateFiles(picked);
    setFileError(error);
    setUploadFiles(error ? [] : picked);
  };

  const onCreatePatient = (event: FormEvent) => {
    event.preventDefault();
    createPatientMutation.mutate(form);
  };

  const onUpload = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId || uploadFiles.length === 0) {
      toast.error("Select patient and at least one file");
      return;
    }
    uploadMutation.mutate({
      patientId: selectedPatientId,
      files: uploadFiles
    });
  };

  const onEdit = (patient: Patient) => {
    setEditPatient(patient);
    setForm({
      fullName: patient.fullName,
      parentName: patient.parentName,
      spectrum: patient.spectrum,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phone,
      address: patient.address,
      notes: patient.notes ?? ""
    });
    setShowEditModal(true);
  };

  const onDelete = (patient: Patient) => {
    const confirmed = window.confirm(`Delete patient ${patient.fullName}?`);
    if (!confirmed) return;
    deleteMutation.mutate(patient.id);
  };

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">Patient Records</h2>
            <p className="section-subtitle">Manage enrollment, profile updates, and document records.</p>
          </div>
          <div className="actions-row">
            <Button onClick={() => setShowEnrollModal(true)}>+ Enroll Patient</Button>
            <Button onClick={() => setShowUploadModal(true)}>+ Upload Document</Button>
          </div>
        </div>
        <div className="table-filters">
          <label>
            Search
            <input
              className="input"
              placeholder="Search by name, parent, phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label>
            Spectrum
            <select className="select" value={spectrumFilter} onChange={(e) => setSpectrumFilter(e.target.value)}>
              <option value="all">All</option>
              {spectrumOptions.map((option) => (
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
                <button className="sort-btn" type="button" onClick={() => onSort("parentName")}>
                  Parent {sortIndicator("parentName")}
                </button>
              </th>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("spectrum")}>
                  Spectrum {sortIndicator("spectrum")}
                </button>
              </th>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("dateOfBirth")}>
                  DOB {sortIndicator("dateOfBirth")}
                </button>
              </th>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("phone")}>
                  Phone {sortIndicator("phone")}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPatients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.fullName}</td>
                <td>{patient.parentName}</td>
                <td>{patient.spectrum}</td>
                <td>{patient.dateOfBirth}</td>
                <td>{patient.phone}</td>
                <td>
                  <div className="icon-actions">
                    <ActionIconButton
                      action="view"
                      aria-label="View patient"
                      onClick={() => {
                        setViewPatient(patient);
                        setShowViewModal(true);
                      }}
                    />
                    <ActionIconButton action="edit" aria-label="Edit patient" onClick={() => onEdit(patient)} />
                    <ActionIconButton action="delete" aria-label="Delete patient" onClick={() => onDelete(patient)} />
                  </div>
                </td>
              </tr>
            ))}
            {paginatedPatients.length === 0 ? (
              <tr>
                <td colSpan={6}>No patients found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="pagination-row">
          <p>
            Showing {filteredPatients.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + pageSize, filteredPatients.length)} of {filteredPatients.length}
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
              <h3>Patient Enrollment</h3>
              <button className="icon-btn" onClick={() => setShowEnrollModal(false)}>
                ✕
              </button>
            </div>
            <form className="grid" onSubmit={onCreatePatient}>
              <label>
                Full Name
                <input className="input" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
              </label>
              <label>
                Parent Name
                <input
                  className="input"
                  value={form.parentName}
                  onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                  required
                />
              </label>
              <label>
                Spectrum
                <select className="select" value={form.spectrum} onChange={(e) => setForm((f) => ({ ...f, spectrum: e.target.value }))}>
                  {spectrumOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date of Birth
                <input
                  className="input"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  required
                />
              </label>
              <label>
                Phone
                <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </label>
              <label>
                Address
                <textarea className="textarea" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
              </label>
              <label>
                Notes
                <textarea className="textarea" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
              <label>
                Upload Document (optional)
                <input className="input" type="file" multiple onChange={onEnrollmentDocChange} />
              </label>
              {enrollmentDocFiles.length > 0 ? <p>{enrollmentDocFiles.length} file(s) selected</p> : null}
              {fileError ? <p className="error">{fileError}</p> : null}
              <div className="actions-row">
                <Button disabled={createPatientMutation.isPending}>{createPatientMutation.isPending ? "Saving..." : "Enroll Patient"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showUploadModal ? (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Upload Document</h3>
              <button className="icon-btn" onClick={() => setShowUploadModal(false)}>
                ✕
              </button>
            </div>
            <form className="grid" onSubmit={onUpload}>
              <label>
                Patient
                <select className="select" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
                  <option value="">Select patient</option>
                  {(patients ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Files
                <input className="input" type="file" multiple onChange={onUploadFileChange} />
              </label>
              {fileError ? <p className="error">{fileError}</p> : null}
              {previewUrl ? <img src={previewUrl} alt="preview" style={{ maxWidth: "100%", borderRadius: 8 }} /> : null}
              {uploadFiles.length > 0 ? (
                <p>
                  {uploadFiles.length} file(s) selected
                </p>
              ) : null}
              <div className="actions-row">
                <Button disabled={uploadMutation.isPending}>{uploadMutation.isPending ? "Uploading..." : "Upload Document"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showViewModal && viewPatient ? (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Patient Details</h3>
              <button className="icon-btn" onClick={() => setShowViewModal(false)}>
                ✕
              </button>
            </div>
            <p>
              <strong>Name:</strong> {viewPatient.fullName}
            </p>
            <p>
              <strong>DOB:</strong> {viewPatient.dateOfBirth}
            </p>
            <p>
              <strong>Parent:</strong> {viewPatient.parentName}
            </p>
            <p>
              <strong>Phone:</strong> {viewPatient.phone}
            </p>
            <p>
              <strong>Spectrum:</strong> {viewPatient.spectrum}
            </p>
            <p>
              <strong>Address:</strong> {viewPatient.address}
            </p>
            <p>
              <strong>Notes:</strong> {viewPatient.notes || "-"}
            </p>
            <p>
              <strong>Documents:</strong>{" "}
              {viewPatient.documents.length === 0 ? (
                "-"
              ) : (
                <table className="table table-striped doc-table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Version</th>
                      <th>Uploaded At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewPatient.documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.fileName}</td>
                        <td>{doc.contentType}</td>
                        <td>{formatBytes(doc.size)}</td>
                        <td>v{doc.version}</td>
                        <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
                        <td>
                          <div className="icon-actions">
                            <button
                              type="button"
                              className="icon-btn icon-only"
                              title="View Document"
                              aria-label="View document"
                              onClick={() => {
                                if (!doc.fileUrl) {
                                  toast.error("File URL not available");
                                  return;
                                }
                                const fullUrl = doc.fileUrl.startsWith("http")
                                  ? doc.fileUrl
                                  : `${window.location.protocol}//${window.location.hostname}:8010${doc.fileUrl}`;
                                window.open(fullUrl, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                <path
                                  fill="currentColor"
                                  d="M12 5c5.1 0 9.3 3 11 7-1.7 4-5.9 7-11 7S2.7 16 1 12c1.7-4 5.9-7 11-7zm0 2C8 7 4.7 9.2 3.2 12 4.7 14.8 8 17 12 17s7.3-2.2 8.8-5C19.3 9.2 16 7 12 7zm0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-only"
                              title="Download Document"
                              aria-label="Download document"
                              onClick={() => {
                                if (!doc.fileUrl) {
                                  toast.error("File URL not available");
                                  return;
                                }
                                const url = doc.fileUrl.startsWith("http")
                                  ? doc.fileUrl
                                  : `${window.location.protocol}//${window.location.hostname}:8010${doc.fileUrl}`;
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = doc.fileName;
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                <path fill="currentColor" d="M5 20h14v-2H5v2zm7-18v10.2l3.6-3.6L17 10l-5 5-5-5 1.4-1.4L11 12.2V2h1z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-only danger"
                              title="Delete Document"
                              aria-label="Delete document"
                              onClick={() => {
                                const confirmed = window.confirm(`Delete document ${doc.fileName}?`);
                                if (!confirmed) return;
                                deleteDocumentMutation.mutate({ patientId: viewPatient.id, documentId: doc.id });
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2zm-1 6h2v9H8V9zm6 0h2v9h-2V9zM6 9h2v9H6V9z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {showEditModal && editPatient ? (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Edit Patient</h3>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>
            <form
              className="grid"
              onSubmit={(event) => {
                event.preventDefault();
                updateMutation.mutate({ patientId: editPatient.id, payload: form });
              }}
            >
              <label>
                Full Name
                <input className="input" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
              </label>
              <label>
                Parent Name
                <input
                  className="input"
                  value={form.parentName}
                  onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                  required
                />
              </label>
              <label>
                Spectrum
                <select className="select" value={form.spectrum} onChange={(e) => setForm((f) => ({ ...f, spectrum: e.target.value }))}>
                  {spectrumOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date of Birth
                <input
                  className="input"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  required
                />
              </label>
              <label>
                Phone
                <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </label>
              <label>
                Address
                <textarea className="textarea" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
              </label>
              <label>
                Notes
                <textarea className="textarea" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
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
