import { AxiosAdapter, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from "axios";
import { mockDb, makeId } from "../mocks/mockDb";
import { AuthTokens, PatientDocument, Role, SessionEvent } from "../types";

interface RouteResult {
  status: number;
  data: unknown;
}

const parseData = <T>(data: unknown): T => {
  if (!data) return {} as T;
  if (typeof data === "string") return JSON.parse(data) as T;
  return data as T;
};

const tokenFor = (userId: string) => `access-${userId}-${Date.now()}`;
const refreshFor = (userId: string) => `refresh-${userId}-${Date.now()}`;

const buildAuthTokens = (userId: string): AuthTokens => {
  const accessToken = tokenFor(userId);
  const refreshToken = refreshFor(userId);
  mockDb.refreshTokens[refreshToken] = userId;
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + 15 * 60 * 1000
  };
};

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

const scheduleOrConflict = (candidate: SessionEvent, currentId?: string): RouteResult => {
  const start = new Date(candidate.startsAt);
  const end = new Date(candidate.endsAt);

  const conflict = mockDb.sessions.find((s) => {
    if (s.id === currentId || s.status === "cancelled") return false;
    if (s.therapistId !== candidate.therapistId) return false;
    return overlaps(start, end, new Date(s.startsAt), new Date(s.endsAt));
  });

  if (conflict) {
    return {
      status: 409,
      data: {
        message: "Therapist is already booked for this time range.",
        code: "DOUBLE_BOOKING"
      }
    };
  }

  if (currentId) {
    const idx = mockDb.sessions.findIndex((s) => s.id === currentId);
    mockDb.sessions[idx] = { ...mockDb.sessions[idx], startsAt: candidate.startsAt, endsAt: candidate.endsAt };
    return { status: 200, data: mockDb.sessions[idx] };
  }

  mockDb.sessions.push(candidate);
  return { status: 201, data: candidate };
};

const getPath = (url = "") => url.split("?")[0].replace(/^\/api/, "");
const trimTrailingSlash = (path = "") => (path.length > 1 ? path.replace(/\/+$/, "") : path);

const route = (config: AxiosRequestConfig): RouteResult => {
  const method = (config.method || "get").toLowerCase();
  const path = getPath(config.url);
  const normalizedPath = trimTrailingSlash(path);

  if (method === "post" && (path === "/auth/login" || path === "/auth/login/")) {
    const body = parseData<{ email: string; password: string }>(config.data);
    const user = mockDb.users.find((u) => u.email === body.email && u.password === body.password);
    if (!user) return { status: 401, data: { message: "Invalid credentials" } };
    const { password: _password, ...safeUser } = user;
    return { status: 200, data: { user: safeUser, tokens: buildAuthTokens(user.id) } };
  }

  if (method === "post" && (path === "/auth/refresh" || path === "/auth/refresh/")) {
    const body = parseData<{ refreshToken: string }>(config.data);
    const userId = mockDb.refreshTokens[body.refreshToken];
    if (!userId) return { status: 401, data: { message: "Refresh token expired" } };
    return { status: 200, data: buildAuthTokens(userId) };
  }

  if (method === "get" && normalizedPath === "/users") {
    return { status: 200, data: mockDb.users.map(({ password: _password, ...safeUser }) => safeUser) };
  }

  if (method === "post" && normalizedPath === "/users") {
    const body = parseData<{ name: string; email: string; role: Role; password: string }>(config.data);
    const existing = mockDb.users.find((user) => user.email.toLowerCase() === body.email.toLowerCase());
    if (existing) return { status: 409, data: { message: "Email already exists" } };
    const user = { id: makeId("u"), ...body };
    mockDb.users.unshift(user);
    const { password: _password, ...safeUser } = user;
    return { status: 201, data: safeUser };
  }

  if ((method === "patch" || method === "put") && normalizedPath?.startsWith("/users/")) {
    const userId = normalizedPath.split("/")[2];
    const body = parseData<{ name: string; email: string; role: Role; password?: string }>(config.data);
    const idx = mockDb.users.findIndex((user) => user.id === userId);
    if (idx === -1) return { status: 404, data: { message: "User not found" } };
    const duplicate = mockDb.users.find((user) => user.id !== userId && user.email.toLowerCase() === body.email.toLowerCase());
    if (duplicate) return { status: 409, data: { message: "Email already exists" } };
    mockDb.users[idx] = { ...mockDb.users[idx], ...body, password: body.password || mockDb.users[idx].password };
    const { password: _password, ...safeUser } = mockDb.users[idx];
    return { status: 200, data: safeUser };
  }

  if (method === "delete" && normalizedPath?.startsWith("/users/")) {
    const userId = normalizedPath.split("/")[2];
    const idx = mockDb.users.findIndex((user) => user.id === userId);
    if (idx === -1) return { status: 404, data: { message: "User not found" } };
    mockDb.users.splice(idx, 1);
    return { status: 204, data: null };
  }

  if (method === "get" && path === "/dashboard/stats") {
    return {
      status: 200,
      data: {
        totalPatients: mockDb.patients.length,
        totalTherapists: mockDb.therapists.length,
        upcomingSessions: mockDb.sessions.filter((s) => s.status === "scheduled").length,
        totalRevenue: mockDb.payments.reduce((sum, p) => sum + p.amount, 0)
      }
    };
  }

  if (method === "get" && path === "/patients") return { status: 200, data: mockDb.patients };

  if (method === "post" && path === "/patients") {
    const body = parseData<{
      fullName: string;
      parentName: string;
      spectrum: string;
      dateOfBirth: string;
      phone: string;
      address: string;
      notes?: string;
    }>(
      config.data
    );
    const patient = {
      id: makeId("p"),
      fullName: body.fullName,
      parentName: body.parentName,
      spectrum: body.spectrum,
      dateOfBirth: body.dateOfBirth,
      phone: body.phone,
      address: body.address,
      notes: body.notes,
      documents: [],
      createdAt: new Date().toISOString()
    };
    mockDb.patients.unshift(patient);
    return { status: 201, data: patient };
  }

  if (method === "post" && path?.startsWith("/patients/") && path.endsWith("/documents")) {
    const patientId = path.split("/")[2];
    const body = parseData<{ fileName: string; contentType: string; size: number }>(config.data);
    const patient = mockDb.patients.find((p) => p.id === patientId);
    if (!patient) return { status: 404, data: { message: "Patient not found" } };
    const version = patient.documents.length + 1;
    const doc: PatientDocument = {
      id: makeId("doc"),
      patientId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
      version,
      uploadedAt: new Date().toISOString()
    };
    patient.documents.push(doc);
    return { status: 201, data: doc };
  }

  if (method === "patch" && path?.startsWith("/patients/")) {
    const patientId = path.split("/")[2];
    const body = parseData<{
      fullName: string;
      parentName: string;
      spectrum: string;
      dateOfBirth: string;
      phone: string;
      address: string;
      notes?: string;
    }>(
      config.data
    );
    const idx = mockDb.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) return { status: 404, data: { message: "Patient not found" } };
    mockDb.patients[idx] = { ...mockDb.patients[idx], ...body };
    return { status: 200, data: mockDb.patients[idx] };
  }

  if (method === "delete" && path?.startsWith("/patients/")) {
    const patientId = path.split("/")[2];
    const idx = mockDb.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) return { status: 404, data: { message: "Patient not found" } };
    mockDb.patients.splice(idx, 1);
    return { status: 204, data: null };
  }

  if (method === "get" && path === "/therapists") return { status: 200, data: mockDb.therapists };

  if (method === "post" && path === "/therapists") {
    const body = parseData<{ fullName: string; specialty: string; availability: Array<{ dayOfWeek: number; startHour: string; endHour: string }> }>(config.data);
    const therapist = { id: makeId("t"), ...body };
    mockDb.therapists.unshift(therapist);
    return { status: 201, data: therapist };
  }

  if (method === "patch" && path?.startsWith("/therapists/")) {
    const therapistId = path.split("/")[2];
    const body = parseData<{ fullName: string; specialty: string; availability: Array<{ dayOfWeek: number; startHour: string; endHour: string }> }>(
      config.data
    );
    const idx = mockDb.therapists.findIndex((t) => t.id === therapistId);
    if (idx === -1) return { status: 404, data: { message: "Therapist not found" } };
    mockDb.therapists[idx] = { ...mockDb.therapists[idx], ...body };
    return { status: 200, data: mockDb.therapists[idx] };
  }

  if (method === "delete" && path?.startsWith("/therapists/")) {
    const therapistId = path.split("/")[2];
    const idx = mockDb.therapists.findIndex((t) => t.id === therapistId);
    if (idx === -1) return { status: 404, data: { message: "Therapist not found" } };
    mockDb.therapists.splice(idx, 1);
    return { status: 204, data: null };
  }

  if (method === "get" && path === "/sessions") return { status: 200, data: mockDb.sessions };

  if (method === "post" && path === "/sessions") {
    const body = parseData<Omit<SessionEvent, "id" | "status"> & { status?: SessionEvent["status"] }>(config.data);
    const candidate: SessionEvent = { ...body, id: makeId("s"), status: body.status ?? "scheduled" };
    return scheduleOrConflict(candidate);
  }

  if (method === "patch" && path?.startsWith("/sessions/") && path.endsWith("/reschedule")) {
    const sessionId = path.split("/")[2];
    const body = parseData<{ startsAt: string; endsAt: string }>(config.data);
    const session = mockDb.sessions.find((s) => s.id === sessionId);
    if (!session) return { status: 404, data: { message: "Session not found" } };
    return scheduleOrConflict({ ...session, startsAt: body.startsAt, endsAt: body.endsAt }, sessionId);
  }

  if (method === "post" && path === "/payments") {
    const body = parseData<{ patientId: string; sessionId?: string; amount: number; method: "cash" | "card" | "online" }>(config.data);
    const payment = { id: makeId("pay"), ...body, createdAt: new Date().toISOString() };
    mockDb.payments.unshift(payment);
    return { status: 201, data: payment };
  }

  if (method === "get" && path === "/payments") return { status: 200, data: mockDb.payments };

  return { status: 404, data: { message: `Unknown route ${method.toUpperCase()} ${path}` } };
};

export const mockAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const result = route(config);

  const response: AxiosResponse = {
    data: result.data,
    status: result.status,
    statusText: String(result.status),
    headers: new AxiosHeaders(),
    config
  };

  if (result.status >= 400) {
    return Promise.reject({ response, config, isAxiosError: true });
  }

  return response;
};
