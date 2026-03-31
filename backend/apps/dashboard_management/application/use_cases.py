from apps.dashboard_management.domain.entities import DashboardStatsEntity
from apps.dashboard_management.domain.repositories import DashboardRepository


class DashboardUseCases:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def get_stats(self) -> DashboardStatsEntity:
        return self.repository.get_stats()

