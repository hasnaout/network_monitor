import win32serviceutil
import win32service
import win32event
import servicemanager
import threading
from core.agent_core import run_agent

class NetworkAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "NetworkAgent"
    _svc_display_name_ = "Network Monitoring Agent"
    _svc_description_ = "Surveille la connectivité réseau et envoie des heartbeats"

    def __init__(self, args):
        super().__init__(args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.thread = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)

    def SvcDoRun(self):
        self.ReportServiceStatus(win32service.SERVICE_RUNNING)
        servicemanager.LogInfoMsg("Service démarré")
        self.thread = threading.Thread(
            target=run_agent,
            args=(self.stop_event,),
            daemon=True
        )
        self.thread.start()
        win32event.WaitForSingleObject(
            self.stop_event,
            win32event.INFINITE
        )

if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(NetworkAgentService)