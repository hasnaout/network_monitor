import time
import requests
from core.config import API_URL, INTERVAL
from core.system_info import (
    get_hostname, get_ip, get_mac,
    get_user, get_cpu, get_ram, check_network
)

def run_agent(stop_event=None):
    print("Agent démarré")

    while True:
        if stop_event is not None:
            try:
                import win32event
                if win32event.WaitForSingleObject(stop_event, 0) == 0:
                    break
            except:
                pass

        data = {
            "name": get_hostname(),
            "mac_address": get_mac(),
            "ip_address": get_ip(),
            "connected_user": get_user(),
            "network_state": check_network(),
            "cpu_usage": get_cpu(),
            "ram_usage": get_ram(),
        }

        try:
            response = requests.post(API_URL, json=data, timeout=5)
            print(f"Signal envoyé : {data['name']} - {response.status_code}")
        except Exception as e:
            print(f"Erreur : {e}")

        time.sleep(INTERVAL)