# J'importe toutes les bibliotheques dont j'ai besoin
import getpass
import json
import os
import socket
import subprocess
import sys
import time
import uuid
from datetime import datetime
from urllib.parse import urlparse

import psutil
import requests
import servicemanager
import win32event
import win32service
import win32serviceutil

DEFAULT_SERVER_URL = "http://192.168.120.237:8000/api/heartbeat/ping/"


def get_config_path():
    """Obtenir le chemin du fichier config"""
    # Quand compilé avec PyInstaller, utiliser le répertoire de l'exécutable
    if getattr(sys, 'frozen', False):
        # L'app est exécutée depuis PyInstaller
        base_dir = os.path.dirname(sys.executable)
    else:
        # L'app est exécutée directement depuis Python
        base_dir = os.path.dirname(os.path.abspath(__file__))
    
    return os.path.join(base_dir, "agent.config.json")


CONFIG_FILE = get_config_path()
INTERVAL = 30


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


def get_pc_name():
    return socket.gethostname()


def get_ip():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip_address = sock.getsockname()[0]
        sock.close()
        return ip_address
    except Exception:
        return "inconnu"


def get_mac():
    return ":".join(
        ["{:02x}".format((uuid.getnode() >> offset) & 0xFF) for offset in range(0, 2 * 6, 8)][::-1]
    )


def check_connectivity():
    try:
        ping_result = subprocess.run(
            ["ping", "-n", "1", get_server_host()],
            capture_output=True,
            timeout=5,
        )
        ping_ok = ping_result.returncode == 0
    except Exception:
        ping_ok = False

    try:
        http_result = requests.get(get_server_base_url(), timeout=5)
        http_ok = http_result.status_code == 200
    except Exception:
        http_ok = False

    if ping_ok and http_ok:
        return "Accessible"
    return "Non accessible"


def send_heartbeat():
    data = {
        "name": get_pc_name(),
        "mac_address": get_mac(),
        "ip_address": get_ip(),
    }

    try:
        response = requests.post(get_server_url(), json=data, timeout=5)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        pass


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

        while self.running:
            send_heartbeat()
            time.sleep(INTERVAL)


if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(NetworkAgentService)
