from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("remote_commands", "0002_add_shell_field"),
    ]

    operations = [
        migrations.AddField(
            model_name="remotecommand",
            name="working_directory",
            field=models.CharField(blank=True, default="", max_length=1024),
        ),
    ]
