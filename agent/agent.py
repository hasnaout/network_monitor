import json
import os
import socket
import subprocess
import time
import uuid
import requests

import servicemanager
import win32event
import win32service
import win32serviceutil

import sys


# ================= CONFIG =================
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "agent.config.json")

DEFAULT_SERVER_URL = "http://127.0.0.1:8000/api/heartbeat/ping/"


# ================= CONFIG LOAD =================
def load_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def get_server_url():
    config = load_config()
    return config.get("server_url") or DEFAULT_SERVER_URL


def get_server_host():
    return socket.gethostbyname("localhost")


# ================= DEVICE INFO =================
def get_pc_name():
    return socket.gethostname()


def get_ip():
    try:
        return socket.gethostbyname(socket.gethostname())
    except:
        return "unknown"


def get_mac():
    return ":".join(
        ["{:02x}".format((uuid.getnode() >> i) & 0xff) for i in range(0, 48, 8)][::-1]
    )


# ================= HEARTBEAT =================
def send_heartbeat():
    with open("agent.log", "a") as f:
        f.write("TRY HEARTBEAT\n")

    try:
        response = requests.post(get_server_url(), json={
            "name": get_pc_name(),
            "mac_address": get_mac(),
            "ip_address": get_ip(),
        }, timeout=5)

        response.raise_for_status()

        with open("agent.log", "a") as f:
            f.write("HEARTBEAT OK\n")

    except Exception as e:
        with open("agent.log", "a") as f:
            f.write(f"HEARTBEAT ERROR: {e}\n")


# ================= SERVICE =================
class NetworkAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "NetworkAgent"
    _svc_display_name_ = "Network Monitoring Agent"
    _svc_description_ = "Surveille le réseau et envoie des heartbeats"

    def __init__(self, args):
        super().__init__(args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.running = False
        win32event.SetEvent(self.stop_event)

    def SvcDoRun(self):
      import servicemanager

      try:
        servicemanager.LogInfoMsg("NetworkAgent starting")

        # ⚠️ IMPORTANT : répondre immédiatement à Windows
        self.ReportServiceStatus(win32service.SERVICE_RUNNING)

        with open("agent.log", "a") as f:
            f.write("SERVICE STARTED\n")

        while self.running:
            try:
                send_heartbeat()
            except Exception as e:
                with open("agent.log", "a") as f:
                    f.write(f"ERROR LOOP: {e}\n")

            time.sleep(30)

      except Exception as e:
        with open("agent.log", "a") as f:
            f.write(f"FATAL START ERROR: {e}\n")

# ================= ENTRY POINT =================
def main():
    win32serviceutil.HandleCommandLine(NetworkAgentService)
if __name__ == "__main__":
    main()