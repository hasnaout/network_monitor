import win32serviceutil
import win32service
import win32event
import servicemanager
import time
import requests

from config import API_URL, INTERVAL
from system_info import *

class NetworkAgent(win32serviceutil.ServiceFramework):

    _svc_name_ = "NetworkAgent"
    _svc_display_name_ = "Network Monitoring Agent"
    _svc_description_ = "Envoie des informations système au serveur"

    def __init__(self, args):
        super().__init__(args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        self.running = False
        win32event.SetEvent(self.stop_event)

    def SvcDoRun(self):
        servicemanager.LogInfoMsg("Service démarré")
        self.main()

    def main(self):
        while self.running:
            try:
                payload = {
                    "mac_address": get_mac(),
                    "name": get_hostname(),
                    "ip_address": get_ip(),
                    "connected_user": get_user(),
                    "cpu_usage": get_cpu(),
                    "ram_usage": get_ram(),
                }

                requests.post(API_URL, json=payload, timeout=5)

            except Exception as e:
                servicemanager.LogErrorMsg(str(e))

            time.sleep(INTERVAL)


if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(NetworkAgent)