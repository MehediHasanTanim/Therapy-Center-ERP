from enum import StrEnum


class TherapistSpecialty(StrEnum):
    SPEECH_THERAPIST = "Speech Therapist"
    OCCUPATIONAL_THERAPIST = "Occupational Therapist"
    BEHAVIROAL_THERAPIST = "Behaviroal Therapist"
    OTHER = "Other"

    @classmethod
    def values(cls) -> list[str]:
        return [item.value for item in cls]

