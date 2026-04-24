import win32serviceutil
import win32service
import win32event
import servicemanager
import time
import requests
import threading
import logging

from config import API_URL, INTERVAL
from system_info import get_mac, get_hostname, get_ip

logging.basicConfig(
    filename="C:\\NetworkAgent.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

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
        logging.info("Service stoppé")

    def SvcDoRun(self):  
        servicemanager.LogInfoMsg("Service démarré")
        logging.info("Service démarré")

        self.ReportServiceStatus(win32service.SERVICE_RUNNING)

        thread = threading.Thread(target=self.main)
        thread.daemon = True
        thread.start()

        win32event.WaitForSingleObject(self.stop_event, win32event.INFINITE)

     def main(self):
        while self.running:
            try:
                payload = {
                    "mac_address": get_mac(),
                    "name": get_hostname(),
                    "ip_address": get_ip(),
                }

                requests.post(
                    API_URL,
                    json=payload,
                    timeout=5
                )

            except Exception as e:
                logging.error(str(e))

            time.sleep(INTERVAL)
if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(NetworkAgent)