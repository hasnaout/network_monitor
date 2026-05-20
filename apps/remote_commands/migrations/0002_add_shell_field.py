# Generated migration to add shell field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('remote_commands', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='remotecommand',
            name='shell',
            field=models.CharField(
                choices=[('cmd', 'Command Prompt (cmd.exe)'), ('powershell', 'PowerShell (pwsh.exe)')],
                default='cmd',
                max_length=16,
                verbose_name='Shell utilisé'
            ),
        ),
    ]
