def run_agent(stop_event):
    import time
    from core.config import INTERVAL
    from core.system_info import get_ip, get_hostname, get_mac
    from core.logger import log

    log("Agent started")

    while True:
        # arrêt propre service
        import win32event
        if win32event.WaitForSingleObject(stop_event, 0) == 0:
            break

        data = {
            "mac_address": get_mac(),
            "name": get_hostname(),
            "ip_address": get_ip(),
        }

        try:
            import requests
            requests.post("https://trinity-unherolike-meanly.ngrok-free.d/api/heartbeat/ping/", json=data, timeout=5)
        except:
            pass

        time.sleep(INTERVAL)