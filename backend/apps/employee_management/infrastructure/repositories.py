from datetime import date
from uuid import UUID

from django.db import transaction
from django.db.models import Max

from apps.employee_management.domain.entities import EmployeeCompensationEntity, EmployeeDocumentEntity, EmployeeEntity
from apps.employee_management.domain.repositories import EmployeeRepository
from apps.user_management.infrastructure.models import User

from .models import Employee, EmployeeCompensation, EmployeeDocument


def _document_entity(doc: EmployeeDocument) -> EmployeeDocumentEntity:
    file_url = doc.file.url if doc.file else None
    return EmployeeDocumentEntity(
        id=doc.id,
        employee_id=doc.employee_id,
        file_name=doc.file_name,
        content_type=doc.content_type,
        size=doc.size,
        doc_type=doc.doc_type,
        version=doc.version,
        uploaded_at=doc.uploaded_at,
        file_url=file_url,
    )


def _comp_entity(comp: EmployeeCompensation | None) -> EmployeeCompensationEntity | None:
    if not comp:
        return None
    return EmployeeCompensationEntity(
        id=comp.id,
        employee_id=comp.employee_id,
        pay_type=comp.pay_type,
        base_rate=float(comp.base_rate),
        currency=comp.currency,
        effective_from=comp.effective_from,
        effective_to=comp.effective_to,
    )


def _employee_entity(employee: Employee, documents: list[EmployeeDocument], compensation: EmployeeCompensation | None) -> EmployeeEntity:
    return EmployeeEntity(
        id=employee.id,
        user_id=employee.user_id,
        email=employee.user.email,
        role=employee.user.role,
        full_name=employee.full_name,
        phone=employee.phone,
        address=employee.address,
        date_of_birth=employee.date_of_birth,
        national_id=employee.national_id,
        emergency_contact_name=employee.emergency_contact_name,
        emergency_contact_phone=employee.emergency_contact_phone,
        status=employee.status,
        job_title=employee.job_title,
        department=employee.department,
        employment_type=employee.employment_type,
        join_date=employee.join_date,
        end_date=employee.end_date,
        manager_id=employee.manager_id,
        notes=employee.notes,
        created_at=employee.created_at,
        compensation=_comp_entity(compensation),
        documents=[_document_entity(doc) for doc in documents],
    )


class DjangoEmployeeRepository(EmployeeRepository):
    def list_all(
        self,
        *,
        search: str | None,
        status: str | None,
        department: str | None,
        employment_type: str | None,
        sort_by: str | None,
        sort_dir: str | None,
    ) -> list[EmployeeEntity]:
        queryset = self._apply_filters(
            search=search,
            status=status,
            department=department,
            employment_type=employment_type,
        )
        queryset = self._apply_sort(queryset, sort_by, sort_dir)
        employees = queryset.all()
        return self._to_entities(employees)

    def list_paginated(
        self,
        *,
        search: str | None,
        status: str | None,
        department: str | None,
        employment_type: str | None,
        sort_by: str | None,
        sort_dir: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[EmployeeEntity], int]:
        queryset = self._apply_filters(
            search=search,
            status=status,
            department=department,
            employment_type=employment_type,
        )
        total = queryset.count()
        queryset = self._apply_sort(queryset, sort_by, sort_dir)
        offset = (page - 1) * page_size
        employees = queryset[offset : offset + page_size]
        return self._to_entities(employees), total

    def get_by_id(self, employee_id: UUID) -> EmployeeEntity | None:
        employee = (
            Employee.objects.select_related("user", "manager")
            .prefetch_related("documents", "compensations")
            .filter(id=employee_id)
            .first()
        )
        if not employee:
            return None
        documents = list(employee.documents.all())
        compensation = self._active_compensation(employee)
        return _employee_entity(employee, documents, compensation)

    def user_exists(self, user_id: UUID) -> bool:
        return User.objects.filter(id=user_id).exists()

    def user_linked(self, user_id: UUID) -> bool:
        return Employee.objects.filter(user_id=user_id).exists()

    def add(
        self,
        *,
        user_id: UUID,
        full_name: str,
        phone: str,
        address: str | None,
        date_of_birth: date | None,
        national_id: str | None,
        emergency_contact_name: str | None,
        emergency_contact_phone: str | None,
        status: str,
        job_title: str,
        department: str,
        employment_type: str,
        join_date: date,
        end_date: date | None,
        manager_id: UUID | None,
        notes: str | None,
        compensation: dict | None,
    ) -> EmployeeEntity:
        employee = Employee.objects.create(
            user_id=user_id,
            full_name=full_name,
            phone=phone,
            address=address,
            date_of_birth=date_of_birth,
            national_id=national_id,
            emergency_contact_name=emergency_contact_name,
            emergency_contact_phone=emergency_contact_phone,
            status=status,
            job_title=job_title,
            department=department,
            employment_type=employment_type,
            join_date=join_date,
            end_date=end_date,
            manager_id=manager_id,
            notes=notes,
        )
        comp = None
        if compensation:
            comp = EmployeeCompensation.objects.create(
                employee=employee,
                pay_type=compensation.get("payType"),
                base_rate=compensation.get("baseRate"),
                currency=compensation.get("currency") or "BDT",
                effective_from=compensation.get("effectiveFrom") or employee.join_date,
                effective_to=compensation.get("effectiveTo"),
            )
        return _employee_entity(employee, [], comp)

    def update(
        self,
        *,
        employee_id: UUID,
        full_name: str,
        phone: str,
        address: str | None,
        date_of_birth: date | None,
        national_id: str | None,
        emergency_contact_name: str | None,
        emergency_contact_phone: str | None,
        status: str,
        job_title: str,
        department: str,
        employment_type: str,
        join_date: date,
        end_date: date | None,
        manager_id: UUID | None,
        notes: str | None,
        compensation: dict | None,
    ) -> EmployeeEntity:
        employee = Employee.objects.get(id=employee_id)
        employee.full_name = full_name
        employee.phone = phone
        employee.address = address
        employee.date_of_birth = date_of_birth
        employee.national_id = national_id
        employee.emergency_contact_name = emergency_contact_name
        employee.emergency_contact_phone = emergency_contact_phone
        employee.status = status
        employee.job_title = job_title
        employee.department = department
        employee.employment_type = employment_type
        employee.join_date = join_date
        employee.end_date = end_date
        employee.manager_id = manager_id
        employee.notes = notes
        employee.save(update_fields=[
            "full_name",
            "phone",
            "address",
            "date_of_birth",
            "national_id",
            "emergency_contact_name",
            "emergency_contact_phone",
            "status",
            "job_title",
            "department",
            "employment_type",
            "join_date",
            "end_date",
            "manager",
            "notes",
            "updated_at",
        ])

        comp = None
        if compensation:
            comp = self._active_compensation(employee)
            if comp:
                comp.pay_type = compensation.get("payType")
                comp.base_rate = compensation.get("baseRate")
                comp.currency = compensation.get("currency") or comp.currency
                comp.effective_from = compensation.get("effectiveFrom") or comp.effective_from
                comp.effective_to = compensation.get("effectiveTo")
                comp.save()
            else:
                comp = EmployeeCompensation.objects.create(
                    employee=employee,
                    pay_type=compensation.get("payType"),
                    base_rate=compensation.get("baseRate"),
                    currency=compensation.get("currency") or "BDT",
                    effective_from=compensation.get("effectiveFrom") or employee.join_date,
                    effective_to=compensation.get("effectiveTo"),
                )

        documents = list(employee.documents.all())
        return _employee_entity(employee, documents, comp)

    def deactivate(self, employee_id: UUID, end_date: date | None) -> EmployeeEntity:
        employee = Employee.objects.get(id=employee_id)
        employee.status = "inactive"
        employee.end_date = end_date or employee.end_date
        employee.save(update_fields=["status", "end_date", "updated_at"])
        documents = list(employee.documents.all())
        comp = self._active_compensation(employee)
        return _employee_entity(employee, documents, comp)

    def add_document(
        self,
        *,
        employee_id: UUID,
        file_name: str,
        content_type: str,
        size: int,
        doc_type: str,
        uploaded_file,
        uploaded_by_id: UUID | None,
    ) -> EmployeeDocumentEntity:
        employee = Employee.objects.get(id=employee_id)
        last_version = (
            EmployeeDocument.objects.filter(employee=employee).aggregate(latest=Max("version")).get("latest") or 0
        )
        document = EmployeeDocument.objects.create(
            employee=employee,
            file_name=file_name,
            content_type=content_type,
            size=size,
            doc_type=doc_type,
            file=uploaded_file,
            version=last_version + 1,
            uploaded_by_id=uploaded_by_id,
        )
        return _document_entity(document)

    def delete_document(self, *, employee_id: UUID, document_id: UUID) -> bool:
        deleted, _ = EmployeeDocument.objects.filter(employee_id=employee_id, id=document_id).delete()
        return deleted > 0

    def active_compensation(self, employee_id: UUID) -> EmployeeCompensationEntity | None:
        comp = (
            EmployeeCompensation.objects.filter(employee_id=employee_id, effective_to__isnull=True)
            .order_by("-effective_from")
            .first()
        )
        return _comp_entity(comp)

    def list_documents(self, employee_id: UUID):
        return [_document_entity(doc) for doc in EmployeeDocument.objects.filter(employee_id=employee_id)]

    def update_user_role(self, user_id: UUID, role: str | None, full_name: str | None) -> None:
        user = User.objects.get(id=user_id)
        if role:
            user.role = role
        if full_name:
            user.name = full_name
        user.save(update_fields=["role", "name", "updated_at"])

    @staticmethod
    def _active_compensation(employee: Employee) -> EmployeeCompensation | None:
        return employee.compensations.filter(effective_to__isnull=True).order_by("-effective_from").first()

    def _apply_filters(
        self,
        *,
        search: str | None,
        status: str | None,
        department: str | None,
        employment_type: str | None,
    ):
        queryset = Employee.objects.select_related("user", "manager").prefetch_related("documents", "compensations")
        if status:
            queryset = queryset.filter(status=status)
        if department:
            queryset = queryset.filter(department=department)
        if employment_type:
            queryset = queryset.filter(employment_type=employment_type)
        if search:
            queryset = queryset.filter(
                models.Q(full_name__icontains=search)
                | models.Q(phone__icontains=search)
                | models.Q(user__email__icontains=search)
                | models.Q(job_title__icontains=search)
            )
        return queryset

    @staticmethod
    def _apply_sort(queryset, sort_by: str | None, sort_dir: str | None):
        sort_fields = {
            "name": "full_name",
            "email": "user__email",
            "status": "status",
            "department": "department",
            "employmentType": "employment_type",
            "joinDate": "join_date",
        }
        field = sort_fields.get(sort_by or "", "created_at")
        prefix = "-" if (sort_dir or "desc") == "desc" else ""
        return queryset.order_by(f"{prefix}{field}")

    def _to_entities(self, employees):
        entities: list[EmployeeEntity] = []
        for employee in employees:
            documents = list(employee.documents.all())
            compensation = self._active_compensation(employee)
            entities.append(_employee_entity(employee, documents, compensation))
        return entities
