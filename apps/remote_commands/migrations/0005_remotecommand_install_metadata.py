from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("remote_commands", "0004_remotecommand_cancel_requested_and_cancelled"),
    ]

    operations = [
        migrations.AddField(
            model_name="remotecommand",
            name="category",
            field=models.CharField(
                choices=[
                    ("remote_command", "Remote Command"),
                    ("software_install", "Software Install"),
                ],
                default="remote_command",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="remotecommand",
            name="package_manager",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="remotecommand",
            name="package_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="remotecommand",
            name="package_version",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
