from enum import StrEnum


class PaymentMethod(StrEnum):
    CASH = "cash"
    CARD = "card"
    ONLINE = "online"

    @classmethod
    def values(cls) -> list[str]:
        return [item.value for item in cls]

