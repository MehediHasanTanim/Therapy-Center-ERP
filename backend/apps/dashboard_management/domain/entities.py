from dataclasses import dataclass


@dataclass(slots=True)
class DashboardStatsEntity:
    total_patients: int
    total_therapists: int
    upcoming_sessions_today: int
    upcoming_sessions_tomorrow: int
    revenue_current_month: float
