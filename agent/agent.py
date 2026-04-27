import json
import os
import socket
import subprocess
import sys
import uuid
from datetime import datetime
from urllib.parse import urlparse

import requests
import servicemanager
import win32event
import win32service
import win32serviceutil

DEFAULT_SERVER_URL = "http://192.168.120.237:8000/api/heartbeat/ping/"
INTERVAL = 30
REQUEST_TIMEOUT = 5


def get_runtime_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(__file__)


CONFIG_FILE = os.path.join(get_runtime_dir(), "agent.config.json")


def load_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as stream:
            return json.load(stream)
    except Exception:
        return {}


def get_server_url():
    config = load_config()
    return config.get("server_url") or os.getenv("NETWORK_MONITOR_SERVER_URL") or DEFAULT_SERVER_URL


def get_server_base_url():
    parsed = urlparse(get_server_url())
    return f"{parsed.scheme}://{parsed.netloc}"


def get_server_host():
    return urlparse(get_server_url()).hostname or "127.0.0.1"


def get_server_port():
    parsed = urlparse(get_server_url())
    if parsed.port:
        return parsed.port
    return 443 if parsed.scheme == "https" else 80


def get_pc_name():
    return socket.gethostname()


def get_mac():
    mac = uuid.getnode()
    return ":".join(f"{(mac >> shift) & 0xFF:02X}" for shift in range(40, -1, -8))


def get_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def log_info(message):
    try:
        servicemanager.LogInfoMsg(f"{NetworkAgentService._svc_name_}: {message}")
    except Exception:
        pass


def log_error(message):
    try:
        servicemanager.LogErrorMsg(f"{NetworkAgentService._svc_name_}: {message}")
    except Exception:
        pass


def check_connectivity():
    try:
        ping_result = subprocess.run(
            ["ping", "-n", "1", get_server_host()],
            capture_output=True,
            timeout=REQUEST_TIMEOUT,
        )
        ping_ok = ping_result.returncode == 0
    except Exception:
        ping_ok = False

    try:
        with socket.create_connection((get_server_host(), get_server_port()), timeout=REQUEST_TIMEOUT):
            tcp_ok = True
    except Exception:
        tcp_ok = False

    if ping_ok or tcp_ok:
        return "Accessible"
    return "Non accessible"


def send_heartbeat():
    data = {
        "name": get_pc_name(),
        "mac_address": get_mac(),
        "ip_address": get_ip(),
        "network_state": check_connectivity(),
        "timestamp": datetime.now().isoformat(),
    }

    try:
        response = requests.post(get_server_url(), json=data, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return True
    except requests.RequestException as exc:
        log_error(f"Echec d'envoi du heartbeat vers {get_server_url()}: {exc}")
        return False


class NetworkAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "NetworkAgent"
    _svc_display_name_ = "Network Monitoring Agent"
    _svc_description_ = "Surveille la connectivite reseau et envoie des heartbeats"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        self.running = False

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, ""),
        )
        log_info("Service demarre")

        while self.running:
            send_heartbeat()
            wait_result = win32event.WaitForSingleObject(self.stop_event, INTERVAL * 1000)
            if wait_result == win32event.WAIT_OBJECT_0:
                break

        log_info("Service arrete")


if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(NetworkAgentService)
