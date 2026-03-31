from datetime import date
import csv

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone
from fpdf import FPDF

from apps.patient_management.presentation.permissions import IsTherapyStaffOrAbove
from apps.reports_management.application.use_cases import ReportsUseCases
from apps.reports_management.infrastructure.repositories import DjangoReportsRepository


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _get_param(request, key: str) -> str | None:
    value = request.GET.get(key)
    if value is None:
        value = request.query_params.get(key)
    if isinstance(value, (list, tuple)):
        return value[0] if value else None
    return value


def _format_date(value: date) -> str:
    return value.strftime("%b %d, %Y")


def _format_datetime(value) -> str:
    return timezone.localtime(value).strftime("%b %d, %Y, %I:%M %p")


def _csv_response(filename: str, rows: list[list[str | int | float]]) -> HttpResponse:
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerows(rows)
    return response


def _pdf_response(filename: str, title: str, rows: list[list[str | int | float]]) -> HttpResponse:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 10, title, ln=True)
    pdf.set_font("Helvetica", size=9)

    page_width = pdf.w - 2 * pdf.l_margin

    def _truncate(text: str, width: float) -> str:
        if pdf.get_string_width(text) <= width:
            return text
        trimmed = text
        while trimmed and pdf.get_string_width(f"{trimmed}...") > width:
            trimmed = trimmed[:-1]
        return f"{trimmed}..." if trimmed else ""

    header_pending = True
    for row in rows:
        if not row:
            pdf.ln(4)
            header_pending = True
            continue
        if len(row) <= 2:
            label = _truncate(str(row[0]), page_width * 0.35)
            value = _truncate(str(row[1]) if len(row) > 1 else "", page_width * 0.6)
            pdf.set_font("Helvetica", size=9, style="B")
            pdf.cell(page_width * 0.35, 6, label, border=0)
            pdf.set_font("Helvetica", size=9, style="")
            pdf.cell(page_width * 0.6, 6, value, border=0, ln=True)
            header_pending = True
            continue

        cols = len(row)
        col_width = page_width / cols
        pdf.set_font("Helvetica", size=9, style="B" if header_pending else "")
        if header_pending:
            pdf.set_fill_color(229, 236, 245)
            pdf.set_text_color(20, 40, 80)
        else:
            pdf.set_text_color(0, 0, 0)
        for cell in row:
            text = _truncate(str(cell), col_width - 2)
            pdf.cell(col_width, 6, text, border=1, fill=header_pending)
        pdf.ln(6)
        if header_pending:
            pdf.set_font("Helvetica", size=9, style="")
            pdf.set_text_color(0, 0, 0)
            header_pending = False
    content = pdf.output(dest="S")
    if isinstance(content, str):
        content = content.encode("latin-1")
    elif isinstance(content, bytearray):
        content = bytes(content)
    response = HttpResponse(content, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


class DailyScheduleOverviewView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        target = _parse_date(_get_param(request, "date")) or date.today()
        format_type = _get_param(request, "export")
        data = ReportsUseCases(DjangoReportsRepository()).daily_schedule_overview(target)
        if format_type in {"csv", "pdf"}:
            rows: list[list[str | int | float]] = [
                ["Date", _format_date(target)],
                [],
                ["Patient", "Therapist", "Type", "Therapy Type", "Status", "Starts", "Ends"],
            ]
            for item in data:
                rows.append(
                    [
                        item["patientName"],
                        item["therapistName"],
                        item["type"],
                        item["therapyType"],
                        item["status"],
                        _format_datetime(item["startsAt"]),
                        _format_datetime(item["endsAt"]),
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"daily-schedule-{target}.csv", rows)
            return _pdf_response(f"daily-schedule-{target}.pdf", "Daily Schedule Overview", rows)
        return Response({"date": target, "items": data})


class AttendanceCompletionView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).attendance_completion(start, end)
        if format_type in {"csv", "pdf"}:
            rows = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total", data.get("total", 0)],
                ["Completed", data.get("completed", 0)],
                ["Cancelled", data.get("cancelled", 0)],
                ["Scheduled", data.get("scheduled", 0)],
                ["Completion Rate (%)", data.get("completionRate", 0)],
            ]
            if format_type == "csv":
                return _csv_response(f"attendance-completion-{start}-to-{end}.csv", rows)
            return _pdf_response(f"attendance-completion-{start}-to-{end}.pdf", "Attendance & Completion", rows)
        return Response({"startDate": start, "endDate": end, **data})


class TherapistUtilizationView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).therapist_utilization(start, end)
        if format_type in {"csv", "pdf"}:
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                [],
                ["Therapist", "Available Hours", "Booked Hours", "Utilization %"],
            ]
            for item in data:
                rows.append([item["therapistName"], item["availableHours"], item["bookedHours"], item["utilizationPercent"]])
            if format_type == "csv":
                return _csv_response(f"therapist-utilization-{start}-to-{end}.csv", rows)
            return _pdf_response(f"therapist-utilization-{start}-to-{end}.pdf", "Therapist Utilization", rows)
        return Response({"startDate": start, "endDate": end, "items": data})


class PatientEngagementView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).patient_engagement(start, end)
        if format_type in {"csv", "pdf"}:
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                [],
                ["Patient", "Sessions", "Completed", "Cancelled", "Last Session", "Days Since Last"],
            ]
            for item in data:
                rows.append(
                    [
                        item["patientName"],
                        item["sessionCount"],
                        item["completedCount"],
                        item["cancelledCount"],
                        _format_datetime(item["lastSessionAt"]) if item["lastSessionAt"] else "",
                        item["daysSinceLastSession"] if item["daysSinceLastSession"] is not None else "",
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"patient-engagement-{start}-to-{end}.csv", rows)
            return _pdf_response(f"patient-engagement-{start}-to-{end}.pdf", "Patient Engagement", rows)
        return Response({"startDate": start, "endDate": end, "items": data})


class TherapyTypeDistributionView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).therapy_type_distribution(start, end)
        if format_type in {"csv", "pdf"}:
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                [],
                ["Therapy Type", "Total", "Completed", "Scheduled", "Cancelled", "Completion Rate (%)"],
            ]
            for item in data:
                rows.append(
                    [
                        item["therapyType"],
                        item["total"],
                        item["completed"],
                        item["scheduled"],
                        item["cancelled"],
                        item["completionRate"],
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"therapy-type-distribution-{start}-to-{end}.csv", rows)
            return _pdf_response(f"therapy-type-distribution-{start}-to-{end}.pdf", "Therapy Type Distribution", rows)
        return Response({"startDate": start, "endDate": end, "items": data})


class AssessmentPipelineView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).assessment_pipeline(start, end)
        if format_type in {"csv", "pdf"}:
            summary = data["summary"]
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total", summary.get("total", 0)],
                ["Scheduled", summary.get("scheduled", 0)],
                ["Completed", summary.get("completed", 0)],
                ["Cancelled", summary.get("cancelled", 0)],
                ["Upcoming", summary.get("upcoming", 0)],
                ["Overdue", summary.get("overdue", 0)],
                [],
                ["Patient", "Therapist", "Therapy Type", "Status", "Starts", "Ends"],
            ]
            for item in data.get("items", []):
                rows.append(
                    [
                        item["patientName"],
                        item["therapistName"],
                        item["therapyType"],
                        item["status"],
                        _format_datetime(item["startsAt"]),
                        _format_datetime(item["endsAt"]),
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"assessment-pipeline-{start}-to-{end}.csv", rows)
            return _pdf_response(f"assessment-pipeline-{start}-to-{end}.pdf", "Assessment Pipeline", rows)
        return Response({"startDate": start, "endDate": end, **data})


class CarePlanAdherenceView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).care_plan_adherence(start, end)
        if format_type in {"csv", "pdf"}:
            summary = data["summary"]
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total Patients", summary.get("totalPatients", 0)],
                ["On Track", summary.get("onTrack", 0)],
                ["At Risk", summary.get("atRisk", 0)],
                ["Cancelled Sessions", summary.get("totalCancelled", 0)],
                ["Overall Adherence Rate (%)", summary.get("overallAdherenceRate", 0)],
                [],
                ["Patient", "Total Sessions", "Completed", "Cancelled", "Adherence %", "Last Session"],
            ]
            for item in data.get("items", []):
                rows.append(
                    [
                        item["patientName"],
                        item["totalSessions"],
                        item["completedSessions"],
                        item["cancelledSessions"],
                        item["adherencePercent"],
                        _format_datetime(item["lastSessionAt"]) if item["lastSessionAt"] else "",
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"care-plan-adherence-{start}-to-{end}.csv", rows)
            return _pdf_response(f"care-plan-adherence-{start}-to-{end}.pdf", "Care Plan Adherence", rows)
        return Response({"startDate": start, "endDate": end, **data})


class RevenueSummaryView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        method = _get_param(request, "method")
        therapy_type = _get_param(request, "therapyType")
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).revenue_summary(start, end, method=method, therapy_type=therapy_type)
        if format_type in {"csv", "pdf"}:
            summary = data["summary"]
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total Revenue", summary.get("total", 0)],
                ["Cash", summary.get("byMethod", {}).get("cash", 0)],
                ["Card", summary.get("byMethod", {}).get("card", 0)],
                ["Online", summary.get("byMethod", {}).get("online", 0)],
                [],
                ["Therapy Type", "Revenue"],
            ]
            rows.extend([[item["therapyType"], item["amount"]] for item in data.get("byTherapyType", [])])
            rows.append([])
            rows.append(["Therapy Type", "Cash", "Card", "Online"])
            for item in data.get("byTherapyTypeMethod", []):
                methods = item.get("methods", {})
                rows.append(
                    [
                        item["therapyType"],
                        methods.get("cash", 0),
                        methods.get("card", 0),
                        methods.get("online", 0),
                    ]
                )
            rows.append([])
            rows.append(["Date", "Revenue"])
            rows.extend([[_format_date(date.fromisoformat(item["date"])), item["amount"]] for item in data.get("byDay", [])])
            if format_type == "csv":
                return _csv_response(f"revenue-summary-{start}-to-{end}.csv", rows)
            return _pdf_response(f"revenue-summary-{start}-to-{end}.pdf", "Revenue Summary", rows)
        return Response({"startDate": start, "endDate": end, **data})


class PaymentStatusView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        method = _get_param(request, "method")
        therapy_type = _get_param(request, "therapyType")
        payment_status = _get_param(request, "paymentStatus")
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        if payment_status and payment_status not in {"paid", "unpaid"}:
            return Response({"message": "paymentStatus must be 'paid' or 'unpaid'"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).payment_status(
            start, end, method=method, therapy_type=therapy_type, payment_status=payment_status
        )
        if format_type in {"csv", "pdf"}:
            summary = data["summary"]
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total Sessions", summary.get("totalSessions", 0)],
                ["Paid Sessions", summary.get("paidSessions", 0)],
                ["Unpaid Sessions", summary.get("unpaidSessions", 0)],
                ["Total Collected", summary.get("totalCollected", 0)],
                [],
                ["Patient", "Therapist", "Type", "Therapy Type", "Status", "Starts", "Ends", "Collected"],
            ]
            for item in data.get("items", []):
                rows.append(
                    [
                        item["patientName"],
                        item["therapistName"],
                        item["type"],
                        item["therapyType"],
                        item["status"],
                        _format_datetime(item["startsAt"]),
                        _format_datetime(item["endsAt"]),
                        item["collectedAmount"],
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"payment-status-{start}-to-{end}.csv", rows)
            return _pdf_response(f"payment-status-{start}-to-{end}.pdf", "Payment Status", rows)
        return Response({"startDate": start, "endDate": end, **data})


class TherapistPayoutsView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        method = _get_param(request, "method")
        therapy_type = _get_param(request, "therapyType")
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).therapist_payouts(start, end, method=method, therapy_type=therapy_type)
        if format_type in {"csv", "pdf"}:
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total Collected", data.get("summary", {}).get("totalCollected", 0)],
                ["Total Payout", data.get("summary", {}).get("totalPayout", 0)],
                [],
                ["Therapist", "Payout %", "Collected", "Payout Amount", "Payments", "Sessions"],
            ]
            for item in data.get("items", []):
                rows.append(
                    [
                        item["therapistName"],
                        item.get("payoutPercentage", 0),
                        item["collectedAmount"],
                        item.get("payoutAmount", 0),
                        item["paymentCount"],
                        item["sessionCount"],
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"therapist-payouts-{start}-to-{end}.csv", rows)
            return _pdf_response(f"therapist-payouts-{start}-to-{end}.pdf", "Therapist Payouts", rows)
        return Response({"startDate": start, "endDate": end, **data})


class ConflictReportView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).conflict_report(start, end)
        if format_type in {"csv", "pdf"}:
            summary = data.get("summary", {})
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total Conflicts", summary.get("totalConflicts", 0)],
                ["Created Conflicts", summary.get("createdConflicts", 0)],
                ["Attempted Conflicts", summary.get("attemptedConflicts", 0)],
                [],
                [
                    "Type",
                    "Therapist",
                    "Patient",
                    "Other Patient",
                    "Therapy Type",
                    "Session Type",
                    "Starts",
                    "Ends",
                    "Conflict Starts",
                    "Conflict Ends",
                    "Reason",
                    "Action",
                    "Logged At",
                ],
            ]
            for item in data.get("items", []):
                rows.append(
                    [
                        item.get("conflictType"),
                        item.get("therapistName"),
                        item.get("patientName"),
                        item.get("patientNameOther", ""),
                        item.get("therapyType"),
                        item.get("type"),
                        _format_datetime(item.get("startsAt")) if item.get("startsAt") else "",
                        _format_datetime(item.get("endsAt")) if item.get("endsAt") else "",
                        _format_datetime(item.get("conflictStartsAt")) if item.get("conflictStartsAt") else "",
                        _format_datetime(item.get("conflictEndsAt")) if item.get("conflictEndsAt") else "",
                        item.get("reason", ""),
                        item.get("action", ""),
                        _format_datetime(item.get("loggedAt")) if item.get("loggedAt") else "",
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"conflict-report-{start}-to-{end}.csv", rows)
            return _pdf_response(f"conflict-report-{start}-to-{end}.pdf", "Conflict Report", rows)
        return Response({"startDate": start, "endDate": end, **data})


class NoShowCancellationReasonsView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).no_show_cancellation_reasons(start, end)
        if format_type in {"csv", "pdf"}:
            summary = data.get("summary", {})
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                ["Total Cancelled", summary.get("totalCancelled", 0)],
                ["Total No-Show", summary.get("totalNoShow", 0)],
                ["Unspecified Cancelled", summary.get("unspecifiedCancelled", 0)],
                ["Unspecified No-Show", summary.get("unspecifiedNoShow", 0)],
                [],
                ["Cancellation Reason", "Count"],
            ]
            rows.extend([[item["reason"], item["count"]] for item in data.get("cancellationReasons", [])])
            rows.append([])
            rows.append(["No-Show Reason", "Count"])
            rows.extend([[item["reason"], item["count"]] for item in data.get("noShowReasons", [])])
            rows.append([])
            rows.append(["Date", "Cancelled", "No-Show"])
            rows.extend(
                [
                    [_format_date(date.fromisoformat(item["date"])), item["cancelledCount"], item["noShowCount"]]
                    for item in data.get("trends", [])
                ]
            )
            if format_type == "csv":
                return _csv_response(f"no-show-cancellation-reasons-{start}-to-{end}.csv", rows)
            return _pdf_response(
                f"no-show-cancellation-reasons-{start}-to-{end}.pdf",
                "No-Show & Cancellation Reasons",
                rows,
            )
        return Response({"startDate": start, "endDate": end, **data})


class AuditTrailReportView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        user_id = _get_param(request, "userId")
        action = _get_param(request, "action")
        entity_type = _get_param(request, "entityType")
        search = _get_param(request, "search")
        patient_id = _get_param(request, "patientId")
        therapist_id = _get_param(request, "therapistId")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).audit_trail(
            start,
            end,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            search=search,
            patient_id=patient_id,
            therapist_id=therapist_id,
        )
        if format_type in {"csv", "pdf"}:
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                [],
                ["Entity:Action", "Count"],
            ]
            rows.extend([[item["key"], item["count"]] for item in data.get("summary", [])])
            rows.append([])
            rows.append(
                [
                    "User",
                    "Email",
                    "Entity",
                    "Entity ID",
                    "Patient",
                    "Therapist",
                    "Session Title",
                    "Payment Method",
                    "Amount",
                    "Action",
                    "Created At",
                ]
            )
            for item in data.get("items", []):
                rows.append(
                    [
                        item["userName"],
                        item["userEmail"],
                        item["entityType"],
                        item["entityId"],
                        item.get("patientName") or item.get("patientId", ""),
                        item.get("therapistName", ""),
                        item.get("sessionTitle", ""),
                        item.get("paymentMethod", ""),
                        item.get("amount", ""),
                        item["action"],
                        _format_datetime(item["createdAt"]),
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"audit-trail-{start}-to-{end}.csv", rows)
            return _pdf_response(f"audit-trail-{start}-to-{end}.pdf", "Audit Trail Report", rows)
        return Response({"startDate": start, "endDate": end, **data})


class DocumentActivityReportView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        start = _parse_date(_get_param(request, "startDate"))
        end = _parse_date(_get_param(request, "endDate"))
        format_type = _get_param(request, "export")
        patient_id = _get_param(request, "patientId")
        action = _get_param(request, "action")
        if start is None or end is None:
            return Response({"message": "startDate and endDate are required (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        if end < start:
            return Response({"message": "endDate must be >= startDate"}, status=status.HTTP_400_BAD_REQUEST)
        data = ReportsUseCases(DjangoReportsRepository()).document_activity(
            start,
            end,
            patient_id=patient_id,
            action=action,
        )
        if format_type in {"csv", "pdf"}:
            rows: list[list[str | int | float]] = [
                ["Start Date", _format_date(start)],
                ["End Date", _format_date(end)],
                [],
                ["Action", "Count"],
            ]
            rows.extend([[item["action"], item["count"]] for item in data.get("summary", [])])
            rows.append([])
            rows.append(["User", "Email", "Patient", "Document ID", "File", "Version", "Action", "Created At"])
            for item in data.get("items", []):
                rows.append(
                    [
                        item["userName"],
                        item["userEmail"],
                        item["patientName"],
                        item["documentId"],
                        item["fileName"],
                        item["version"],
                        item["action"],
                        _format_datetime(item["createdAt"]),
                    ]
                )
            if format_type == "csv":
                return _csv_response(f"document-activity-{start}-to-{end}.csv", rows)
            return _pdf_response(f"document-activity-{start}-to-{end}.pdf", "Document Activity Report", rows)
        return Response({"startDate": start, "endDate": end, **data})
