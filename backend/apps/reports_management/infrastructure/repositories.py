from collections import defaultdict
from datetime import date, datetime, time, timedelta

from django.db import models
from django.db.models import Prefetch
from django.utils import timezone

from apps.patient_management.infrastructure.models import Patient
from apps.payment_management.infrastructure.models import Payment
from apps.reports_management.domain.repositories import ReportsRepository
from apps.reports_management.infrastructure.models import AuditLog, DocumentActivity
from apps.session_management.infrastructure.models import Session, SessionConflictLog
from apps.therapist_management.infrastructure.models import Therapist, TherapistAvailability


def _range_bounds(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(start_date, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(end_date + timedelta(days=1), time.min), tz)
    return start_dt, end_dt


class DjangoReportsRepository(ReportsRepository):
    def daily_schedule_overview(self, target_date: date) -> list[dict]:
        start_dt, end_dt = _range_bounds(target_date, target_date)
        sessions = (
            Session.objects.select_related("patient", "therapist")
            .filter(starts_at__gte=start_dt, starts_at__lt=end_dt)
            .order_by("starts_at")
        )
        return [
            {
                "id": session.id,
                "title": session.title,
                "patientName": session.patient.full_name,
                "therapistName": session.therapist.full_name,
                "therapyType": session.therapy_type,
                "type": session.type,
                "status": session.status,
                "startsAt": session.starts_at,
                "endsAt": session.ends_at,
            }
            for session in sessions
        ]

    def attendance_completion(self, start_date: date, end_date: date) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt)
        status_counts = defaultdict(int)
        for session in sessions:
            status_counts[session.status] += 1
        total = sum(status_counts.values())
        completed = status_counts.get("completed", 0)
        cancelled = status_counts.get("cancelled", 0)
        scheduled = status_counts.get("scheduled", 0)
        completion_rate = round((completed / total) * 100, 2) if total > 0 else 0
        return {
            "total": total,
            "completed": completed,
            "cancelled": cancelled,
            "scheduled": scheduled,
            "completionRate": completion_rate,
        }

    def therapist_utilization(self, start_date: date, end_date: date) -> list[dict]:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        day_counts = defaultdict(int)
        current = start_date
        while current <= end_date:
            day_counts[current.weekday()] += 1
            current += timedelta(days=1)

        therapists = Therapist.objects.prefetch_related(
            Prefetch("availability", queryset=TherapistAvailability.objects.all())
        )
        sessions = (
            Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt)
            .exclude(status="cancelled")
            .select_related("therapist")
        )
        booked_by_therapist: dict[str, float] = defaultdict(float)
        for session in sessions:
            duration = (session.ends_at - session.starts_at).total_seconds() / 3600
            booked_by_therapist[str(session.therapist_id)] += duration

        results: list[dict] = []
        for therapist in therapists:
            available_hours = 0.0
            for slot in therapist.availability.all():
                occurrences = day_counts.get(slot.day_of_week, 0)
                slot_hours = (datetime.combine(date.min, slot.end_hour) - datetime.combine(date.min, slot.start_hour)).total_seconds() / 3600
                available_hours += slot_hours * occurrences
            booked_hours = booked_by_therapist.get(str(therapist.id), 0.0)
            utilization = round((booked_hours / available_hours) * 100, 2) if available_hours > 0 else 0
            results.append(
                {
                    "therapistId": therapist.id,
                    "therapistName": therapist.full_name,
                    "availableHours": round(available_hours, 2),
                    "bookedHours": round(booked_hours, 2),
                    "utilizationPercent": utilization,
                }
            )
        return results

    def patient_engagement(self, start_date: date, end_date: date) -> list[dict]:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = (
            Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt)
            .select_related("patient")
            .order_by("starts_at")
        )
        engagement: dict[str, dict] = {}
        for session in sessions:
            pid = str(session.patient_id)
            if pid not in engagement:
                engagement[pid] = {
                    "patientId": session.patient_id,
                    "patientName": session.patient.full_name,
                    "sessionCount": 0,
                    "completedCount": 0,
                    "cancelledCount": 0,
                    "lastSessionAt": None,
                }
            row = engagement[pid]
            row["sessionCount"] += 1
            if session.status == "completed":
                row["completedCount"] += 1
            if session.status == "cancelled":
                row["cancelledCount"] += 1
            row["lastSessionAt"] = session.starts_at

        results = list(engagement.values())
        now = timezone.now()
        for row in results:
            last_session = row["lastSessionAt"]
            row["daysSinceLastSession"] = (now - last_session).days if last_session else None
        return results

    def therapy_type_distribution(self, start_date: date, end_date: date) -> list[dict]:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt, type="therapy")
        buckets: dict[str, dict] = {}
        for session in sessions:
            key = session.therapy_type or "Unknown"
            if key not in buckets:
                buckets[key] = {
                    "therapyType": key,
                    "total": 0,
                    "completed": 0,
                    "cancelled": 0,
                    "scheduled": 0,
                }
            row = buckets[key]
            row["total"] += 1
            if session.status == "completed":
                row["completed"] += 1
            elif session.status == "cancelled":
                row["cancelled"] += 1
            else:
                row["scheduled"] += 1
        results = []
        for row in buckets.values():
            total = row["total"]
            row["completionRate"] = round((row["completed"] / total) * 100, 2) if total else 0
            results.append(row)
        results.sort(key=lambda item: item["therapyType"])
        return results

    def assessment_pipeline(self, start_date: date, end_date: date) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = (
            Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt, type="assessment")
            .select_related("patient", "therapist")
            .order_by("starts_at")
        )
        now = timezone.now()
        summary = {
            "total": 0,
            "scheduled": 0,
            "completed": 0,
            "cancelled": 0,
            "overdue": 0,
            "upcoming": 0,
        }
        items: list[dict] = []
        for session in sessions:
            summary["total"] += 1
            if session.status == "completed":
                summary["completed"] += 1
            elif session.status == "cancelled":
                summary["cancelled"] += 1
            else:
                summary["scheduled"] += 1
                if session.ends_at < now:
                    summary["overdue"] += 1
                if session.starts_at >= now:
                    summary["upcoming"] += 1
            items.append(
                {
                    "id": session.id,
                    "patientName": session.patient.full_name,
                    "therapistName": session.therapist.full_name,
                    "therapyType": session.therapy_type,
                    "status": session.status,
                    "startsAt": session.starts_at,
                    "endsAt": session.ends_at,
                }
            )
        return {"summary": summary, "items": items}

    def care_plan_adherence(self, start_date: date, end_date: date) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = (
            Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt, type="therapy")
            .select_related("patient")
            .order_by("starts_at")
        )
        adherence: dict[str, dict] = {}
        for session in sessions:
            pid = str(session.patient_id)
            if pid not in adherence:
                adherence[pid] = {
                    "patientId": session.patient_id,
                    "patientName": session.patient.full_name,
                    "totalSessions": 0,
                    "completedSessions": 0,
                    "cancelledSessions": 0,
                    "lastSessionAt": None,
                }
            row = adherence[pid]
            row["totalSessions"] += 1
            if session.status == "completed":
                row["completedSessions"] += 1
            elif session.status == "cancelled":
                row["cancelledSessions"] += 1
            row["lastSessionAt"] = session.starts_at

        items = []
        on_track = 0
        at_risk = 0
        total_cancelled = 0
        for row in adherence.values():
            effective_total = row["totalSessions"] - row["cancelledSessions"]
            adherence_rate = round((row["completedSessions"] / effective_total) * 100, 2) if effective_total > 0 else 0
            if adherence_rate >= 80:
                on_track += 1
            else:
                at_risk += 1
            total_cancelled += row["cancelledSessions"]
            items.append({**row, "adherencePercent": adherence_rate})

        items.sort(key=lambda item: item["patientName"])
        total_patients = len(items)
        overall_rate = round(
            sum(item["adherencePercent"] for item in items) / total_patients, 2
        ) if total_patients > 0 else 0
        return {
            "summary": {
                "totalPatients": total_patients,
                "onTrack": on_track,
                "atRisk": at_risk,
                "overallAdherenceRate": overall_rate,
                "totalCancelled": total_cancelled,
            },
            "items": items,
        }

    def revenue_summary(self, start_date: date, end_date: date, method: str | None = None, therapy_type: str | None = None) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        payments = Payment.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt).select_related("session")
        if method:
            payments = payments.filter(method=method)
        if therapy_type:
            payments = payments.filter(session__therapy_type=therapy_type)
        payments = payments.order_by("created_at")
        total = 0.0
        by_method: dict[str, float] = defaultdict(float)
        by_therapy: dict[str, float] = defaultdict(float)
        by_therapy_method: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
        by_day: dict[date, float] = defaultdict(float)

        for payment in payments:
            amount = float(payment.amount)
            total += amount
            by_method[payment.method] += amount
            therapy_type = payment.session.therapy_type if payment.session else "Unassigned"
            by_therapy[therapy_type] += amount
            by_therapy_method[therapy_type][payment.method] += amount
            pay_day = timezone.localtime(payment.created_at).date()
            by_day[pay_day] += amount

        method_order = ["cash", "card", "online"]
        therapy_items = [
            {"therapyType": therapy_type, "amount": round(amount, 2)}
            for therapy_type, amount in sorted(by_therapy.items(), key=lambda item: item[0])
        ]
        therapy_method_items = []
        for therapy_type, methods in sorted(by_therapy_method.items(), key=lambda item: item[0]):
            therapy_method_items.append(
                {
                    "therapyType": therapy_type,
                    "methods": {method: round(methods.get(method, 0.0), 2) for method in method_order},
                }
            )
        day_items = [
            {"date": day.isoformat(), "amount": round(amount, 2)}
            for day, amount in sorted(by_day.items(), key=lambda item: item[0])
        ]

        return {
            "summary": {
                "total": round(total, 2),
                "byMethod": {method: round(amount, 2) for method, amount in by_method.items()},
            },
            "byTherapyType": therapy_items,
            "byTherapyTypeMethod": therapy_method_items,
            "byDay": day_items,
        }

    def payment_status(
        self,
        start_date: date,
        end_date: date,
        method: str | None = None,
        therapy_type: str | None = None,
        payment_status: str | None = None,
    ) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt).select_related("patient", "therapist")
        if therapy_type:
            sessions = sessions.filter(therapy_type=therapy_type)
        sessions = sessions.prefetch_related("payments").order_by("starts_at")
        items: list[dict] = []
        for session in sessions:
            payments = session.payments.all()
            if method:
                payments = [payment for payment in payments if payment.method == method]
            collected = sum(float(payment.amount) for payment in payments)
            items.append(
                {
                    "id": session.id,
                    "patientName": session.patient.full_name,
                    "therapistName": session.therapist.full_name,
                    "therapyType": session.therapy_type,
                    "type": session.type,
                    "status": session.status,
                    "startsAt": session.starts_at,
                    "endsAt": session.ends_at,
                    "collectedAmount": round(collected, 2),
                }
            )

        if payment_status == "paid":
            items = [item for item in items if item["collectedAmount"] > 0]
        elif payment_status == "unpaid":
            items = [item for item in items if item["collectedAmount"] == 0]

        total_sessions = len(items)
        paid_sessions = sum(1 for item in items if item["collectedAmount"] > 0)
        total_collected = round(sum(item["collectedAmount"] for item in items), 2)
        return {
            "summary": {
                "totalSessions": total_sessions,
                "paidSessions": paid_sessions,
                "unpaidSessions": total_sessions - paid_sessions,
                "totalCollected": total_collected,
            },
            "items": items,
        }

    def therapist_payouts(self, start_date: date, end_date: date, method: str | None = None, therapy_type: str | None = None) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        payments = Payment.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt, session__isnull=False).select_related(
            "session__therapist"
        )
        if method:
            payments = payments.filter(method=method)
        if therapy_type:
            payments = payments.filter(session__therapy_type=therapy_type)
        payments = payments.order_by("created_at")
        buckets: dict[str, dict] = {}
        total_collected = 0.0
        total_payout = 0.0
        for payment in payments:
            therapist = payment.session.therapist
            tid = str(therapist.id)
            if tid not in buckets:
                buckets[tid] = {
                    "therapistId": therapist.id,
                    "therapistName": therapist.full_name,
                    "payoutPercentage": float(therapist.payout_percentage),
                    "collectedAmount": 0.0,
                    "payoutAmount": 0.0,
                    "paymentCount": 0,
                    "sessionIds": set(),
                }
            amount = float(payment.amount)
            total_collected += amount
            row = buckets[tid]
            row["collectedAmount"] += amount
            row["paymentCount"] += 1
            row["sessionIds"].add(str(payment.session_id))

        items: list[dict] = []
        for row in buckets.values():
            payout_amount = round(row["collectedAmount"] * (row["payoutPercentage"] / 100.0), 2)
            row["payoutAmount"] = payout_amount
            total_payout += payout_amount
            items.append(
                {
                    "therapistId": row["therapistId"],
                    "therapistName": row["therapistName"],
                    "payoutPercentage": row["payoutPercentage"],
                    "collectedAmount": round(row["collectedAmount"], 2),
                    "payoutAmount": payout_amount,
                    "paymentCount": row["paymentCount"],
                    "sessionCount": len(row["sessionIds"]),
                }
            )
        items.sort(key=lambda item: item["collectedAmount"], reverse=True)
        return {"summary": {"totalCollected": round(total_collected, 2), "totalPayout": round(total_payout, 2)}, "items": items}

    def conflict_report(self, start_date: date, end_date: date) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = (
            Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt)
            .exclude(status="cancelled")
            .select_related("patient", "therapist")
            .order_by("therapist_id", "starts_at")
        )
        attempts = (
            SessionConflictLog.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt)
            .select_related("patient", "therapist")
            .order_by("-created_at")
        )

        items: list[dict] = []
        grouped: dict[str, list[Session]] = defaultdict(list)
        for session in sessions:
            grouped[str(session.therapist_id)].append(session)

        for therapist_sessions in grouped.values():
            therapist_sessions.sort(key=lambda s: s.starts_at)
            for idx, session in enumerate(therapist_sessions):
                for other in therapist_sessions[idx + 1 :]:
                    if other.starts_at >= session.ends_at:
                        break
                    items.append(
                        {
                            "id": f"{session.id}-{other.id}",
                            "conflictType": "existing",
                            "therapistName": session.therapist.full_name,
                            "patientName": session.patient.full_name,
                            "patientNameOther": other.patient.full_name,
                            "therapyType": session.therapy_type,
                            "type": session.type,
                            "startsAt": session.starts_at,
                            "endsAt": session.ends_at,
                            "conflictStartsAt": other.starts_at,
                            "conflictEndsAt": other.ends_at,
                        }
                    )

        for attempt in attempts:
            items.append(
                {
                    "id": str(attempt.id),
                    "conflictType": "attempted",
                    "therapistName": attempt.therapist.full_name,
                    "patientName": attempt.patient.full_name,
                    "therapyType": attempt.therapy_type,
                    "type": attempt.session_type,
                    "startsAt": attempt.starts_at,
                    "endsAt": attempt.ends_at,
                    "reason": attempt.reason,
                    "action": attempt.action,
                    "loggedAt": attempt.created_at,
                }
            )

        created_count = len([item for item in items if item["conflictType"] == "existing"])
        attempted_count = len([item for item in items if item["conflictType"] == "attempted"])
        return {
            "summary": {
                "totalConflicts": created_count + attempted_count,
                "createdConflicts": created_count,
                "attemptedConflicts": attempted_count,
            },
            "items": items,
        }

    def no_show_cancellation_reasons(self, start_date: date, end_date: date) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        sessions = (
            Session.objects.filter(starts_at__gte=start_dt, starts_at__lt=end_dt, status="cancelled")
            .select_related("patient", "therapist")
            .order_by("starts_at")
        )

        cancellation_counts: dict[str, int] = defaultdict(int)
        no_show_counts: dict[str, int] = defaultdict(int)
        trend: dict[date, dict[str, int]] = defaultdict(lambda: {"cancelled": 0, "noShow": 0})

        total_cancelled = sessions.count()
        total_no_show = 0
        cancelled_with_reason = 0

        for session in sessions:
            day = timezone.localtime(session.starts_at).date()
            trend[day]["cancelled"] += 1
            if session.cancellation_reason:
                cancellation_counts[session.cancellation_reason] += 1
                cancelled_with_reason += 1
            if session.no_show_reason:
                no_show_counts[session.no_show_reason] += 1
                total_no_show += 1
                trend[day]["noShow"] += 1

        cancellation_reasons = [
            {"reason": reason, "count": count} for reason, count in sorted(cancellation_counts.items(), key=lambda item: item[1], reverse=True)
        ]
        no_show_reasons = [
            {"reason": reason, "count": count} for reason, count in sorted(no_show_counts.items(), key=lambda item: item[1], reverse=True)
        ]
        trend_items = [
            {"date": day.isoformat(), "cancelledCount": values["cancelled"], "noShowCount": values["noShow"]}
            for day, values in sorted(trend.items(), key=lambda item: item[0])
        ]

        return {
            "summary": {
                "totalCancelled": total_cancelled,
                "totalNoShow": total_no_show,
                "unspecifiedCancelled": total_cancelled - cancelled_with_reason,
                "unspecifiedNoShow": max(total_no_show - sum(no_show_counts.values()), 0),
            },
            "cancellationReasons": cancellation_reasons,
            "noShowReasons": no_show_reasons,
            "trends": trend_items,
        }

    def audit_trail(
        self,
        start_date: date,
        end_date: date,
        user_id: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        search: str | None = None,
        patient_id: str | None = None,
        therapist_id: str | None = None,
    ) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        logs = (
            AuditLog.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt)
            .select_related("user", "patient")
            .order_by("-created_at")
        )
        if user_id:
            logs = logs.filter(user_id=user_id)
        if action:
            logs = logs.filter(action=action)
        if entity_type:
            logs = logs.filter(entity_type=entity_type)
        if search:
            logs = logs.filter(models.Q(patient__full_name__icontains=search) | models.Q(therapist_name__icontains=search))
        if patient_id:
            logs = logs.filter(patient_id=patient_id)
        if therapist_id:
            logs = logs.filter(therapist_id=therapist_id)
        items: list[dict] = []
        summary = defaultdict(int)
        for log in logs:
            if log.entity_type not in {"session", "payment"}:
                continue
            key = f"{log.entity_type}:{log.action}"
            summary[key] += 1
            items.append(
                {
                    "id": str(log.id),
                    "userName": log.user.name if log.user else "System",
                    "userEmail": log.user.email if log.user else "",
                    "entityType": log.entity_type,
                    "entityId": str(log.entity_id),
                    "action": log.action,
                    "createdAt": log.created_at,
                    "metadata": log.metadata,
                    "patientName": log.patient.full_name if log.patient else "",
                    "patientId": str(log.patient_id) if log.patient_id else "",
                    "therapistName": log.therapist_name or "",
                    "sessionTitle": log.session_title or "",
                    "paymentMethod": log.payment_method or "",
                    "amount": float(log.amount) if log.amount is not None else None,
                }
            )
        summary_items = [
            {"key": key, "count": count} for key, count in sorted(summary.items(), key=lambda item: item[0])
        ]
        return {"summary": summary_items, "items": items}

    def document_activity(
        self,
        start_date: date,
        end_date: date,
        patient_id: str | None = None,
        action: str | None = None,
    ) -> dict:
        start_dt, end_dt = _range_bounds(start_date, end_date)
        activities = (
            DocumentActivity.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt)
            .select_related("user", "patient")
            .order_by("-created_at")
        )
        if patient_id:
            activities = activities.filter(patient_id=patient_id)
        if action:
            activities = activities.filter(action=action)
        items: list[dict] = []
        summary = defaultdict(int)
        for activity in activities:
            summary[activity.action] += 1
            items.append(
                {
                    "id": str(activity.id),
                    "userName": activity.user.name if activity.user else "System",
                    "userEmail": activity.user.email if activity.user else "",
                    "patientName": activity.patient.full_name,
                    "documentId": str(activity.document_id),
                    "fileName": activity.file_name,
                    "version": activity.version,
                    "action": activity.action,
                    "createdAt": activity.created_at,
                }
            )
        summary_items = [
            {"action": action, "count": count} for action, count in sorted(summary.items(), key=lambda item: item[0])
        ]
        return {"summary": summary_items, "items": items}
