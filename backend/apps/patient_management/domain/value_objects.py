from enum import StrEnum


class Spectrum(StrEnum):
    ASD = "Autism Spectrum Disorder (ASD)"
    ADHD = "Attention-Deficit/Hyperactivity Disorder (ADHD)"
    CEREBRAL_PALSY = "Cerebral Palsy"
    DOWN_SYNDROME = "Down Syndrome"
    MICROCEPHALY = "Microcephaly"
    INTELLECTUAL_DISABILITY = "Intellectual Disability (ID)"
    OTHER = "Other"

    @classmethod
    def values(cls) -> list[str]:
        return [item.value for item in cls]
