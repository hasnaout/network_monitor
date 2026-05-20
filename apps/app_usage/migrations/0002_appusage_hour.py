from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app_usage", "0001_initial"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="appusage",
            unique_together=set(),
        ),
        migrations.AddField(
            model_name="appusage",
            name="hour",
            field=models.PositiveSmallIntegerField(default=0, verbose_name="Heure"),
        ),
        migrations.AlterUniqueTogether(
            name="appusage",
            unique_together={("device", "app_name", "date", "hour")},
        ),
        migrations.AlterModelOptions(
            name="appusage",
            options={
                "ordering": ["-date", "hour", "-duration_seconds"],
                "verbose_name": "Utilisation application",
                "verbose_name_plural": "Utilisations applications",
            },
        ),
    ]
