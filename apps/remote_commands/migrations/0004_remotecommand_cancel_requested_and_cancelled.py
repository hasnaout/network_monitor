from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("remote_commands", "0003_remotecommand_working_directory"),
    ]

    operations = [
        migrations.AddField(
            model_name="remotecommand",
            name="cancel_requested",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="remotecommand",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "En attente"),
                    ("running", "En cours"),
                    ("success", "Succès"),
                    ("error", "Erreur"),
                    ("timeout", "Timeout"),
                    ("exception", "Exception"),
                    ("cancelled", "Annulée"),
                ],
                default="pending",
                max_length=16,
            ),
        ),
    ]
