from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("remote_commands", "0005_remotecommand_install_metadata"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="remotecommand",
            name="category",
        ),
        migrations.RemoveField(
            model_name="remotecommand",
            name="package_manager",
        ),
        migrations.RemoveField(
            model_name="remotecommand",
            name="package_name",
        ),
        migrations.RemoveField(
            model_name="remotecommand",
            name="package_version",
        ),
    ]
