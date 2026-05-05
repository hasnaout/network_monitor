import json
import os
import socket
import time
import uuid
import sys
import logging

try:
    import requests
except ImportError as e:
    print(f"ERREUR: requests non installé - {e}")
    sys.exit(1)

try:
    import win32event
    import win32service
    import win32serviceutil
    import servicemanager
except ImportError as e:
    print(f"ERREUR: modules win32 non disponibles - {e}")
    sys.exit(1)

# ================= PATH =================
def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = get_base_dir()
CONFIG_FILE = os.path.join(BASE_DIR, "agent.config.json")

# Vérifier que le répertoire existe
if not os.path.exists(BASE_DIR):
    print(f"ERREUR: Répertoire introuvable: {BASE_DIR}")
    sys.exit(1)

# ================= LOGGING =================
try:
    log_file = os.path.join(BASE_DIR, "agent.log")
    logging.basicConfig(
        filename=log_file,
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logger = logging.getLogger("NetworkAgent")
    logger.info("========== AGENT DÉMARRAGE ==========")
    logger.info(f"Répertoire de base: {BASE_DIR}")
    logger.info(f"Fichier config: {CONFIG_FILE}")
except Exception as e:
    print(f"ERREUR lors de la configuration du logging: {e}")
    sys.exit(1)

# ================= CONFIG =================
_config: dict = {}

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

def get_max_retries() -> int:
    """Nombre maximum de tentatives, configurable depuis le JSON."""
    return int(_config.get("max_retries", 3))

def get_retry_delay() -> int:
    """Délai entre les tentatives en secondes, configurable depuis le JSON."""
    return int(_config.get("retry_delay_s", 5))

# ================= DEVICE INFO =================
def get_hostname() -> str:
    return socket.gethostname()

def get_ip() -> str:
    try:
        # Connexion UDP fictive — retourne la bonne IP locale sans envoyer de paquet
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "unknown"

def get_mac() -> str:
    """
    Récupère la MAC address de l'appareil.
    Essaie netifaces en priorité, puis uuid.getnode() en fallback.
    """
    mac = None
    
    # Tentative 1 : netifaces
    try:
        import netifaces
        for iface in netifaces.interfaces():
            addrs = netifaces.ifaddresses(iface)
            if netifaces.AF_LINK in addrs:
                candidate_mac = addrs[netifaces.AF_LINK][0].get("addr", "")
                if candidate_mac and candidate_mac != "00:00:00:00:00:00":
                    mac = candidate_mac
                    logger.debug(f"MAC trouvée via netifaces: {mac}")
                    return mac
    except ImportError:
        logger.debug("netifaces non installé, utilisation de uuid.getnode()")
    except Exception as e:
        logger.warning(f"Erreur avec netifaces: {e}")
    
    # Tentative 2 : uuid.getnode()
    try:
        node = uuid.getnode()
        mac = ":".join(["{:02x}".format((node >> i) & 0xff) for i in range(0, 48, 8)][::-1])
        
        # Vérifier que la MAC n'est pas invalide
        if mac and mac != "00:00:00:00:00:00" and mac.count(":") == 5:
            logger.debug(f"MAC trouvée via uuid.getnode(): {mac}")
            return mac
    except Exception as e:
        logger.warning(f"Erreur avec uuid.getnode(): {e}")
    
    # Fallback : MAC fictive basée sur le hostname
    try:
        hostname_hash = str(hash(get_hostname()))[-10:]
        mac = f"02:{hostname_hash[0:2]}:{hostname_hash[2:4]}:{hostname_hash[4:6]}:{hostname_hash[6:8]}:{hostname_hash[8:10]}"
        logger.warning(f"MAC générée depuis hostname: {mac}")
        return mac
    except Exception as e:
        logger.error(f"Impossible de générer une MAC: {e}")
        return "02:00:00:00:00:00"

def build_payload() -> dict:
    return {
        "name": get_hostname(),
        "mac_address": get_mac(),
        "ip_address": get_ip(),
    }

# ================= HEARTBEAT avec retry =================

def send_heartbeat() -> bool:
    url = get_server_url() + "/api/heartbeat/ping/"
    payload = build_payload()
    
    # Log le payload pour diagnostic
    logger.debug(f"Payload: {payload}")
    
    max_retries = get_max_retries()
    retry_delay = get_retry_delay()

    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(url, json=payload, timeout=5)
            r.raise_for_status()
            logger.info("Heartbeat OK → %s", url)
            return True
        except requests.exceptions.ConnectionError:
            logger.warning("Tentative %d/%d — serveur injoignable (%s)", attempt, max_retries, url)
        except requests.exceptions.Timeout:
            logger.warning("Tentative %d/%d — timeout", attempt, max_retries)
        except requests.exceptions.HTTPError as e:
            logger.error("Erreur HTTP %s - Réponse: %s", e, r.text)
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
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.running = False
        win32event.SetEvent(self.stop_event)
        logger.info("Service arrêté proprement")

    def SvcDoRun(self):
        try:
            servicemanager.LogInfoMsg("NetworkAgent démarré")
            self.ReportServiceStatus(win32service.SERVICE_RUNNING)
            load_config() 
            server_url = get_server_url()
            logger.info("Service démarré — URL : %s", server_url)

            while self.running:
                send_heartbeat()
                interval = get_heartbeat_interval()
                result = win32event.WaitForSingleObject(self.stop_event, interval)
                if result == win32event.WAIT_OBJECT_0:
                    break
        except Exception as e:
            logger.error("Erreur fatale dans SvcDoRun : %s", e)
            servicemanager.LogErrorMsg("Erreur dans NetworkAgent : " + str(e))
            raise 

# ================= ENTRY POINT =================
if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(NetworkAgent)