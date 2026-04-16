class DeviceLog(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    cpu = models.FloatField(null=True)
    ram = models.FloatField(null=True)

    network_status = models.CharField(max_length=20) 