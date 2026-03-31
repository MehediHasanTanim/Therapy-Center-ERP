import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Therapist",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("full_name", models.CharField(max_length=255)),
                ("specialty", models.CharField(max_length=128)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "therapists", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="TherapistAvailability",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("day_of_week", models.PositiveSmallIntegerField()),
                ("start_hour", models.TimeField()),
                ("end_hour", models.TimeField()),
                (
                    "therapist",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="availability",
                        to="therapist_management.therapist",
                    ),
                ),
            ],
            options={"db_table": "therapist_availability", "ordering": ["day_of_week", "start_hour"]},
        ),
        migrations.AddConstraint(
            model_name="therapistavailability",
            constraint=models.CheckConstraint(
                check=models.Q(("day_of_week__gte", 0), ("day_of_week__lte", 6)),
                name="chk_day_of_week_range",
            ),
        ),
        migrations.AddConstraint(
            model_name="therapistavailability",
            constraint=models.CheckConstraint(
                check=models.Q(("start_hour__lt", models.F("end_hour"))),
                name="chk_start_before_end",
            ),
        ),
        migrations.AddConstraint(
            model_name="therapistavailability",
            constraint=models.UniqueConstraint(fields=("therapist", "day_of_week"), name="uniq_therapist_availability_day"),
        ),
    ]

