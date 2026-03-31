from abc import ABC, abstractmethod

from .entities import DashboardStatsEntity


class DashboardRepository(ABC):
    @abstractmethod
    def get_stats(self) -> DashboardStatsEntity:
        raise NotImplementedError

