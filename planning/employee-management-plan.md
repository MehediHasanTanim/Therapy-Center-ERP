# Employee Management Module — Implementation Plan

## 1) Scope & Goals
- Centralize employee records (clinical + admin staff).
- Support lifecycle: onboarding, active employment, role changes, offboarding.
- Attach credentials/documents (certs, contracts, IDs) with audit trail.
- Integrate with scheduling (availability) and user access (roles).

## 2) Roles & Access
- Super Admin: full CRUD, export, deactivate, view sensitive fields.
- Admin: full CRUD, export, view sensitive fields.
- Staff: read-only (own profile + non-sensitive fields) if enabled later.

## 3) Data Model (Backend)
### Core Entities
- Employee
  - id (UUID)
  - full_name
  - email (unique)
  - phone
  - address (optional)
  - date_of_birth (optional)
  - national_id (optional)
  - emergency_contact_name / phone
- status (probation / active / inactive / on_leave)
  - job_title
  - department (clinical / admin / support)
  - employment_type (full_time / part_time / contract)
  - join_date
  - end_date (nullable)
  - manager_id (self FK)
  - notes
  - created_at / updated_at

- EmployeeRoleAssignment
  - employee_id
  - role (super_admin/admin/staff)
  - effective_from / effective_to

- EmployeeCompensation (v1)
  - employee_id
  - pay_type (salary/hourly)
  - base_rate
  - currency
  - effective_from / effective_to

- EmployeeDocument
  - employee_id
  - file_name
  - file_url
  - doc_type (contract/license/id/other)
  - version
  - uploaded_by
  - uploaded_at

### Database Constraints & Indexing
- Unique index on employee.email.
- Index on status, department, employment_type, manager_id, join_date.
- FK constraints + cascading for docs/roles.

## 4) Clean Architecture Mapping
- Domain Layer
  - Entities: EmployeeEntity, EmployeeDocumentEntity, EmployeeRoleEntity
  - Value Objects: Email, Phone, EmploymentStatus (probation/active/inactive/on_leave), EmploymentType
  - Domain Services: EmployeeLifecycleService (hire/terminate)
  - Business Rules: unique email, end_date >= join_date, active only if role assigned, probation allowed before activation

- Application Layer
  - Use Cases: CreateEmployee, UpdateEmployee, DeactivateEmployee, UploadEmployeeDoc, ListEmployees
  - DTOs: CreateEmployeeCommand, UpdateEmployeeCommand, EmployeeResponse
  - Repository Interfaces: EmployeeRepository
  - Unit of Work: EmployeeUoW

- Infrastructure Layer
  - Django ORM models + repository implementations
  - File storage adapter (re-use patient document storage)
  - Audit logging hooks

- Presentation Layer
  - DRF ViewSets + serializers
  - Permissions: AdminOrAbove
  - API endpoints (v1):
    - GET /employees (list + pagination/search/sort)
    - POST /employees
    - GET /employees/{id}
    - PATCH /employees/{id}
    - DELETE /employees/{id} (soft delete -> status=inactive)
    - POST /employees/{id}/documents
    - DELETE /employees/{id}/documents/{docId}

## 5) Frontend Module
### Routes & Pages
- `/employees`
  - table view with search, filters, sort, pagination
  - status pills, role badges
  - actions: view, edit, deactivate
- `/employees/:id`
  - profile details + documents
  - edit modal

### UI Components
- EmployeeTable
- EmployeeFormModal
- EmployeeDocumentTable
- Filters: status, department, employment_type

### UX Requirements
- Consistent with Patients/Therapists UI.
- File upload with preview and validation (pdf/jpg/png).
- Role dropdown (super_admin/admin/staff) with effective dates.

## 6) Security
- JWT auth required.
- RBAC enforced on backend + frontend.
- Sensitive fields masked for staff.
- Audit log on create/update/deactivate/doc upload.

## 7) Testing
- Backend unit tests for use cases & repo.
- Integration test for create/list/update employee.
- Frontend component tests for EmployeeForm and filtering.

## 8) Delivery Steps
1. Backend models + migrations.
2. Repositories/UoW + use cases.
3. API endpoints + permissions.
4. Frontend module + navigation.
5. File upload + document list.
6. Filters, search, sort, pagination.
7. Tests + verification.

## 9) Open Decisions
- Compensation module scope for v1: hourly + salary
- Employee and user accounts should be 1:1 mapping
