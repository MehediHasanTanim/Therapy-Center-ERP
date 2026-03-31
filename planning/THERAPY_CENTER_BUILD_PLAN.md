# Execution Plan (Build-Ready)

## 0. Scope Baseline (Day 0)
1. Freeze MVP scope:
- Roles: `Admin`, `Therapist`, `Receptionist`, `Cashier`
- Core modules: Patient, Therapist, Scheduling, Assessments, Sessions, Billing, Files, Audit
2. Define non-functional targets:
- 99.9% API availability
- P95 API latency < 300ms for core endpoints
- Zero double-booking under concurrent requests
3. Produce initial artifacts:
- Domain glossary
- Bounded contexts
- API versioning policy (`/api/v1`)

---

## 1. Architecture & Design (Sprint 1)
### Deliverables
1. System architecture document:
- Clean Architecture layering
- Context map (Patient, Scheduling, Billing, Identity, Audit)
- Integration points and async events
2. Data design:
- ER diagram (text + visual)
- PostgreSQL schema with constraints and indexes
3. Security design:
- JWT access/refresh lifecycle
- RBAC matrix by endpoint/module
- File upload threat model + controls
4. Concurrency model:
- Atomic scheduling transaction strategy
- DB-level safeguards (`SELECT ... FOR UPDATE`, exclusion/unique constraints)
5. API contract draft:
- OpenAPI for core endpoints

### Exit Criteria
- Approved architecture review
- Approved schema + API contracts
- Approved RBAC and audit policy

---

## 2. Backend Foundation (Django + DRF) (Sprint 2)
### Deliverables
1. Repo scaffolding with strict layer separation:
- `domain/`, `application/`, `infrastructure/`, `presentation/`
2. Cross-cutting infrastructure:
- JWT auth + refresh token rotation
- Unit of Work abstraction + Django implementation
- Base repository interfaces + ORM adapters
- Audit logging middleware/service
- File storage adapter (local/S3-compatible abstraction)
3. Shared policies:
- Validation framework
- Error handling standard
- Idempotency keys for mutation-heavy endpoints

### Exit Criteria
- Auth, RBAC, UoW, auditing fully operational
- CI pipeline running lint/type/test

---

## 3. Core Backend Modules (Sprints 3–4)
### Module Order
1. Patient Enrollment + document metadata/versioning
2. Therapist Enrollment + availability model
3. Therapy/Assessment Scheduling (conflict-safe)
4. Session Management lifecycle
5. Fee collection + payment method tracking

### Per-Module Deliverables
- Domain entities/value objects/rules
- Use cases + DTOs
- Repository interfaces + implementations
- DRF serializers/viewsets/permissions
- Integration + unit tests

### Exit Criteria
- All core APIs complete under `/api/v1`
- Double-booking prevented in concurrent test scenarios
- Audit events recorded for sensitive changes

---

## 4. Frontend Foundation (React + TS) (Sprint 3, parallel)
### Deliverables
1. Scalable frontend structure:
- `app/`, `modules/`, `components/`, `services/`, `hooks/`, `types/`, `utils/`
2. Platform setup:
- React Query, Axios typed client, auth interceptors
- Route guards + role-aware layout/sidebar
- Global error + toast strategy

### Exit Criteria
- Auth + role-based navigation complete
- Shared design/system primitives ready

---

## 5. Frontend Feature Modules (Sprints 4–5)
### Deliverables
1. Dashboards by role
2. Patient/Therapist enrollment forms with validation + file upload preview
3. Scheduling UI:
- FullCalendar integration
- Drag-drop rescheduling
- Conflict prevention UX + optimistic updates
4. Session + Billing screens
5. Audit timeline view (read-only)

### Exit Criteria
- End-to-end flows working for each role
- Optimistic updates rollback correctly on conflict/error

---

## 6. Quality Engineering (Sprints 2–5, continuous)
### Backend
- Unit tests: use cases, domain rules, repository behavior
- Integration tests: scheduling atomicity, auth/rbac
### Frontend
- Component tests (forms, protected routes, calendar interactions)
- React Query tests (cache/optimistic update/rollback)

### Exit Criteria
- Coverage targets: backend 80% critical paths, frontend 70% module paths
- Regression suite green in CI

---

## 7. DevOps, Hardening, Release (Sprint 6)
### Deliverables
1. Dockerized stack:
- Backend, frontend, PostgreSQL, Nginx
2. Deployment assets:
- Nginx reverse proxy config
- Env strategy (`.env` split: dev/stage/prod)
- DB migration and backup/restore runbook
3. Production hardening:
- HTTPS, HSTS, secure cookies
- CORS/CSRF policy
- Rate limiting + brute-force controls
- Observability (structured logs, metrics, alerts)

### Exit Criteria
- Staging deployment successful
- Load and security checks passed
- Release checklist signed off

---

## 8. Build Sequencing Summary
1. Architecture + contracts
2. Backend foundations + security
3. Core backend modules
4. Frontend foundations
5. Frontend modules
6. Testing hardening
7. Deployment and go-live

---

## 9. First Build Sprint Backlog (Start Immediately)
1. Create monorepo structure and CI
2. Implement identity/auth domain + JWT refresh flow
3. Implement UoW + repository base + transaction pattern
4. Design and migrate initial DB schema (users/roles/patients/therapists/availability/sessions)
5. Build scheduling use case with atomic conflict prevention
6. Expose initial APIs + OpenAPI docs
7. Scaffold frontend app shell + auth + protected routes
8. Deliver first vertical slice: "Create Patient + Upload Document + Audit Record"
