from enum import StrEnum


class SessionStatus(StrEnum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    @classmethod
    def values(cls) -> list[str]:
        return [item.value for item in cls]


class SessionKind(StrEnum):
    THERAPY = "therapy"
    ASSESSMENT = "assessment"

    @classmethod
    def values(cls) -> list[str]:
        return [item.value for item in cls]


class TherapyType(StrEnum):
    SPEECH = "Speech"
    OCCUPATIONAL = "Occupational"
    BEHAVIORAL = "Behavioral"
    OTHER = "Other"

    @classmethod
    def values(cls) -> list[str]:
        return [item.value for item in cls]


THERAPY_SPECIALTY_MAP = {
    TherapyType.SPEECH.value: "Speech Therapist",
    TherapyType.OCCUPATIONAL.value: "Occupational Therapist",
    TherapyType.BEHAVIORAL.value: "Behaviroal Therapist",
    TherapyType.OTHER.value: "Other",
}

