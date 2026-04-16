class Device(models.Model):
    name = models.CharField(max_length=100)
    ip_address = models.CharField(max_length=45)
    mac_address = models.CharField(max_length=50)
    username = models.CharField(max_length=100, null=True)
    last_seen = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default="offline")