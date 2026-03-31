from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("therapist_management", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="therapist",
            name="payout_percentage",
            field=models.DecimalField(decimal_places=2, default=70.0, max_digits=5),
        ),
        migrations.AddConstraint(
            model_name="therapist",
            constraint=models.CheckConstraint(
                condition=models.Q(("payout_percentage__gte", 0), ("payout_percentage__lte", 100)),
                name="chk_therapist_payout_percentage_range",
            ),
        ),
    ]
