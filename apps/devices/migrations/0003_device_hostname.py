from django.db import migrations, models


def copy_existing_name_to_hostname(apps, schema_editor):
    Device = apps.get_model("devices", "Device")
    for device in Device.objects.filter(hostname=""):
        device.hostname = device.name or ""
        device.save(update_fields=["hostname"])


class Migration(migrations.Migration):

    dependencies = [
        ("devices", "0002_add_current_user"),
    ]

    operations = [
        migrations.AddField(
            model_name="device",
            name="hostname",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.RunPython(copy_existing_name_to_hostname, migrations.RunPython.noop),
    ]
