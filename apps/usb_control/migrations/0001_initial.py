import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("devices", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="USBDevice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("serial_number", models.CharField(max_length=255)),
                ("name", models.CharField(default="USB Device", max_length=255)),
                ("vendor", models.CharField(blank=True, max_length=255)),
                ("product", models.CharField(blank=True, max_length=255)),
                ("size_bytes", models.BigIntegerField(blank=True, null=True)),
                ("mount_point", models.CharField(blank=True, max_length=50)),
                ("status", models.CharField(choices=[("connected", "Connected"), ("disconnected", "Disconnected"), ("blocked", "Blocked")], default="connected", max_length=20)),
                ("is_trusted", models.BooleanField(default=False)),
                ("first_detected", models.DateTimeField(auto_now_add=True)),
                ("last_connected", models.DateTimeField(blank=True, null=True)),
                ("last_disconnected", models.DateTimeField(blank=True, null=True)),
                ("device", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="usb_devices", to="devices.device")),
            ],
            options={"ordering": ["-last_connected", "name"], "unique_together": {("device", "serial_number")}},
        ),
        migrations.CreateModel(
            name="USBPolicy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("default_policy", models.CharField(choices=[("monitor", "Monitor only"), ("block", "Block unknown"), ("allow", "Allow")], default="monitor", max_length=20)),
                ("allow_unknown_devices", models.BooleanField(default=True)),
                ("max_device_size_gb", models.PositiveIntegerField(blank=True, null=True)),
                ("block_auto_run", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("device", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="usb_policy", to="devices.device")),
            ],
        ),
        migrations.CreateModel(
            name="USBHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(choices=[("connected", "Connected"), ("disconnected", "Disconnected"), ("seen", "Seen"), ("trusted", "Trusted"), ("untrusted", "Untrusted")], max_length=30)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("user_info", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("device", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="usb_history", to="devices.device")),
                ("usb_device", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="history", to="usb_control.usbdevice")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="USBAlert",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("message", models.TextField()),
                ("severity", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")], default="medium", max_length=20)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("device", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="usb_alerts", to="devices.device")),
                ("usb_device", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="alerts", to="usb_control.usbdevice")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
