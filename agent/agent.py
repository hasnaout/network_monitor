import json
import os
import socket
import time
import threading
import uuid
import requests
import sys
import logging

import win32event
import win32service
import win32serviceutil
import servicemanager

# ================= PATH =================
def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = get_base_dir()
CONFIG_FILE = os.path.join(BASE_DIR, "agent.config.json")

logging.basicConfig(
    filename=os.path.join(BASE_DIR, "agent.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    encoding="utf-8",
)
logger = logging.getLogger("NetworkAgent")

# ================= CONFIG =================
_config: dict = {}
_device_info: dict | None = None

def load_config() -> dict:
    global _config
    try:
        with open(CONFIG_FILE, "r") as f:
            _config = json.load(f)
            logger.info("Config chargée depuis %s", CONFIG_FILE)
    except FileNotFoundError:
        logger.warning("Fichier config introuvable, valeurs par défaut utilisées.")
    except json.JSONDecodeError as e:
        logger.error("Config JSON invalide : %s", e)
    return _config

def get_server_url() -> str:
    return _config.get("server_url", "http://127.0.0.1:8001").rstrip("/")

def get_heartbeat_interval() -> int:
    """Intervalle en ms, configurable depuis le JSON."""
    return int(_config.get("heartbeat_interval_ms", 30_000))

# ================= DEVICE INFO =================
def get_hostname() -> str:
    return socket.gethostname()

def get_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return None

def get_mac() -> str:
    node = uuid.getnode()
    return ":".join(
        ["{:02x}".format((node >> i) & 0xff) for i in range(0, 48, 8)][::-1]
    )

def get_device_info() -> dict:
    global _device_info
    if _device_info is None:
        _device_info = {
            "name": get_hostname(),
            "mac_address": get_mac(),
        }
    return _device_info

def build_payload() -> dict:
    device_info = get_device_info()
    return {
        "name": device_info["name"],
        "mac_address": device_info["mac_address"],
        "ip_address": get_ip(),
    }

# ================= HEARTBEAT avec retry =================
def get_max_retries() -> int:
    return int(_config.get("max_retries", 3))

def get_retry_delay_s() -> int:
    return int(_config.get("retry_delay_s", 5))

def get_agent_token() -> str:
    return _config.get("agent_token", "")

def send_heartbeat() -> bool:
    url = get_server_url() + "/api/heartbeat/ping/"
    payload = build_payload()
    headers = {}
    token = get_agent_token()
    if token:
        headers["X-Agent-Token"] = token

    max_retries = get_max_retries()
    retry_delay = get_retry_delay_s()

    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=5)
            r.raise_for_status()
            logger.info("Heartbeat OK → %s", url)
            return True
        except requests.exceptions.ConnectionError:
            logger.warning("Tentative %d/%d — serveur injoignable", attempt, max_retries)
        except requests.exceptions.Timeout:
            logger.warning("Tentative %d/%d — timeout", attempt, max_retries)
        except requests.exceptions.HTTPError as e:
            logger.error("Erreur HTTP %s", e)
            return False  # Pas de retry sur 4xx/5xx
        except Exception as e:
            logger.error("Erreur inattendue : %s", e)
            return False

        if attempt < max_retries:
            time.sleep(retry_delay)

    logger.error("Heartbeat ÉCHOUÉ après %d tentatives", max_retries)
    return False

# ================= SERVICE =================
class NetworkAgent(win32serviceutil.ServiceFramework):
    _svc_name_ = "NetworkAgent"
    _svc_display_name_ = "Network Monitoring Agent"
    _svc_description_ = "Agent léger de supervision réseau"

    def __init__(self, args):
        super().__init__(args)
        self.ReportServiceStatus(win32service.SERVICE_START_PENDING)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.running = False
        win32event.SetEvent(self.stop_event)
        logger.info("Service arrêté proprement")

    def SvcDoRun(self):
        self.ReportServiceStatus(win32service.SERVICE_RUNNING)
        servicemanager.LogInfoMsg("NetworkAgent démarré")

        worker = threading.Thread(target=self._run, daemon=True)
        worker.start()

        win32event.WaitForSingleObject(self.stop_event, win32event.INFINITE)

    def _run(self):
        """Logique principale dans un thread séparé."""
        try:
            load_config()
            logger.info("Service démarré — URL : %s", get_server_url())

            while self.running:
                send_heartbeat()
                interval = get_heartbeat_interval()
                result = win32event.WaitForSingleObject(
                    self.stop_event, interval
                )
                if result == win32event.WAIT_OBJECT_0:
                    break

        except Exception as e:
            logger.error("Erreur fatale : %s", e)
            self.ReportServiceStatus(win32service.SERVICE_STOPPED)

# ================= ENTRY POINT =================
if __name__ == "__main__":
    if getattr(sys, "frozen", False) and len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(NetworkAgent)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(NetworkAgent)
