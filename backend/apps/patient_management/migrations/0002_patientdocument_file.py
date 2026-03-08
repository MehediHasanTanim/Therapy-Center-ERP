from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("patient_management", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientdocument",
            name="file",
            field=models.FileField(default="", upload_to="patient_documents/%Y/%m/%d"),
            preserve_default=False,
        ),
    ]
