import json
import os
import socket
import time
import uuid
import sys
import logging
import subprocess

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
    return int(_config.get("heartbeat_interval_ms", 30_000))

def get_max_retries() -> int:
    return int(_config.get("max_retries", 3))

def get_retry_delay() -> int:
    return int(_config.get("retry_delay_s", 5))

def get_inventory_interval() -> int:
    return int(_config.get("inventory_interval_ms", 3_600_000))

def get_agent_headers() -> dict:
    token = _config.get("agent_token")
    return {"X-Agent-Token": token} if token else {}

# ================= DEVICE INFO =================
def get_hostname() -> str:
    return socket.gethostname()

def get_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "unknown"

def get_mac() -> str:
    mac = None
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
    
    try:
        node = uuid.getnode()
        mac = ":".join(["{:02x}".format((node >> i) & 0xff) for i in range(0, 48, 8)][::-1])
        if mac and mac != "00:00:00:00:00:00" and mac.count(":") == 5:
            logger.debug(f"MAC trouvée via uuid.getnode(): {mac}")
            return mac
    except Exception as e:
        logger.warning(f"Erreur avec uuid.getnode(): {e}")
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
            r = requests.post(url, json=payload, headers=get_agent_headers(), timeout=5)
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

# ================= REMOTE COMMAND EXECUTION =================

def fetch_pending_commands() -> list:
    """
    Interroge le serveur pour récupérer les commandes en attente pour cet agent.
    Endpoint : GET /api/commands/pending/?mac_address=<MAC>
    Réponse  : [{"id": 1, "command": "shutdown /r", "timeout": 30}, ...]
    """
    url = get_server_url() + "/api/commands/pending/"
    params = {"mac_address": get_mac()}
    try:
        r = requests.get(url, params=params, timeout=5)
        r.raise_for_status()
        commands = r.json()
        if commands:
            logger.info("Commandes reçues : %d commande(s)", len(commands))
        return commands if isinstance(commands, list) else []
    except requests.exceptions.ConnectionError:
        logger.debug("Serveur injoignable lors du fetch des commandes")
        return []
    except requests.exceptions.Timeout:
        logger.warning("Timeout lors du fetch des commandes")
        return []
    except Exception as e:
        logger.error("Erreur fetch_pending_commands : %s", e)
        return []


def execute_command(command: str, timeout: int = 30) -> dict:
    """
    Exécute une commande shell et retourne stdout, stderr et le code de retour.
    Le paramètre timeout évite de bloquer l'agent indéfiniment.
    """
    logger.info("Execution commande : %s (timeout=%ds)", command, timeout)
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        output = {
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "returncode": result.returncode,
            "status": "success" if result.returncode == 0 else "error",
        }
        logger.info("Commande terminée — code retour : %d", result.returncode)
        logger.debug("stdout: %s", output["stdout"][:500])
        if output["stderr"]:
            logger.warning("stderr: %s", output["stderr"][:500])
        return output
    except subprocess.TimeoutExpired:
        logger.error("Commande TIMEOUT apres %ds : %s", timeout, command)
        return {
            "stdout": "",
            "stderr": f"Timeout après {timeout} secondes",
            "returncode": -1,
            "status": "timeout",
        }
    except Exception as e:
        logger.error("Erreur execution commande '%s' : %s", command, e)
        return {
            "stdout": "",
            "stderr": str(e),
            "returncode": -1,
            "status": "exception",
        }


def report_command_result(command_id: int, result: dict) -> bool:
    """
    Envoie le résultat d'une commande au serveur.
    Endpoint : POST /api/commands/<id>/result/
    """
    url = get_server_url() + f"/api/commands/{command_id}/result/"
    payload = {
        "mac_address": get_mac(),
        "stdout": result.get("stdout", ""),
        "stderr": result.get("stderr", ""),
        "returncode": result.get("returncode", -1),
        "status": result.get("status", "error"),
    }
    try:
        r = requests.post(url, json=payload, timeout=5)
        r.raise_for_status()
        logger.info("Résultat commande #%d envoyé avec succès", command_id)
        return True
    except requests.exceptions.ConnectionError:
        logger.error("Impossible d'envoyer le résultat commande #%d : serveur injoignable", command_id)
        return False
    except requests.exceptions.HTTPError as e:
        logger.error("Erreur HTTP report commande #%d : %s", command_id, e)
        return False
    except Exception as e:
        logger.error("Erreur report_command_result #%d : %s", command_id, e)
        return False


def process_pending_commands():
    """Cycle complet : fetch → execute → report pour chaque commande en attente."""
    commands = fetch_pending_commands()
    for cmd_entry in commands:
        command_id  = cmd_entry.get("id")
        command_str = cmd_entry.get("command", "").strip()
        timeout     = int(cmd_entry.get("timeout", 30))

        if not command_id or not command_str:
            logger.warning("Commande invalide reçue : %s", cmd_entry)
            continue

        logger.info("Traitement commande #%d : %s", command_id, command_str)
        result = execute_command(command_str, timeout=timeout)
        report_command_result(command_id, result)


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
            next_inventory_at = 0
            logger.info("Service démarré — URL : %s", server_url)

            while self.running:
                send_heartbeat()
                now = time.time()
                if now >= next_inventory_at:
                    send_software_inventory()
                    next_inventory_at = now + (get_inventory_interval() / 1000)

                interval = get_heartbeat_interval()
                result = win32event.WaitForSingleObject(self.stop_event, interval)
                if result == win32event.WAIT_OBJECT_0:
                    break
        except Exception as e:
            logger.error("Erreur fatale dans SvcDoRun : %s", e)
            servicemanager.LogErrorMsg("Erreur dans NetworkAgent : " + str(e))
            raise 

# ================= SOFTWARE INVENTORY =================

def collect_installed_software() -> list:
    import winreg
    software_list = []
    registry_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
    seen = set()

    def collect_from_key(root_key, source_label):
        index = 0
        while True:
            try:
                subkey_name = winreg.EnumKey(root_key, index)
                index += 1
            except OSError:
                break

            try:
                subkey = winreg.OpenKey(root_key, subkey_name)

                try:
                    name = winreg.QueryValueEx(subkey, "DisplayName")[0].strip()
                except FileNotFoundError:
                    name = ""

                winreg.CloseKey(subkey)

                if not name or name in seen:
                    continue

                seen.add(name)
                software_list.append({"name": name})

            except Exception as e:
                logger.debug("Erreur lecture sous-clé %s (%s) : %s", subkey_name, source_label, e)

    try:
        root_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, registry_path, 0, winreg.KEY_READ)
        collect_from_key(root_key, "HKEY_CURRENT_USER")
        winreg.CloseKey(root_key)
    except FileNotFoundError:
        logger.info("Chemin registre introuvable : HKEY_CURRENT_USER\\%s", registry_path)
    except Exception as e:
        logger.warning("Impossible d'ouvrir HKEY_CURRENT_USER\\%s : %s", registry_path, e)

    if software_list:
        logger.info("Inventaire logiciels : %d entrées collectées depuis HKEY_CURRENT_USER", len(software_list))
        return software_list

    logger.info("Aucun logiciel via HKEY_CURRENT_USER, tentative via HKEY_USERS pour le service Windows")

    try:
        users_key = winreg.OpenKey(winreg.HKEY_USERS, "")
    except Exception as e:
        logger.warning("Impossible d'ouvrir HKEY_USERS : %s", e)
        return software_list

    sid_index = 0
    while True:
        try:
            sid = winreg.EnumKey(users_key, sid_index)
            sid_index += 1
        except OSError:
            break

        if not sid.startswith("S-1-5-21-") or sid.endswith("_Classes"):
            continue

        user_registry_path = sid + "\\" + registry_path
        try:
            root_key = winreg.OpenKey(winreg.HKEY_USERS, user_registry_path, 0, winreg.KEY_READ)
            collect_from_key(root_key, f"HKEY_USERS\\{sid}")
            winreg.CloseKey(root_key)
        except FileNotFoundError:
            logger.debug("Chemin registre introuvable : HKEY_USERS\\%s", user_registry_path)
        except Exception as e:
            logger.warning("Impossible d'ouvrir HKEY_USERS\\%s : %s", user_registry_path, e)

    winreg.CloseKey(users_key)

    logger.info("Inventaire logiciels : %d entrées collectées", len(software_list))
    return software_list


def send_software_inventory() -> bool:
    """
    Envoie l'inventaire complet au serveur.
    Endpoint : POST /api/inventory/software/
    Body     : { mac_address, hostname, software: [...] }
    """
    url     = get_server_url() + "/api/inventory/software/"
    software = collect_installed_software()
    if not software:
        logger.warning("Inventaire vide : envoi annulé pour éviter d'effacer les logiciels enregistrés")
        return False

    payload = {
        "mac_address": get_mac(),
        "hostname":    get_hostname(),
        "software":    software,
    }

    logger.info("Envoi inventaire logiciels (%d entrées) → %s", len(payload["software"]), url)

    max_retries  = get_max_retries()
    retry_delay  = get_retry_delay()

    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(url, json=payload, headers=get_agent_headers(), timeout=15)
            r.raise_for_status()
            logger.info("Inventaire logiciels envoyé avec succès")
            return True
        except requests.exceptions.ConnectionError:
            logger.warning("Tentative %d/%d — serveur injoignable", attempt, max_retries)
        except requests.exceptions.Timeout:
            logger.warning("Tentative %d/%d — timeout", attempt, max_retries)
        except requests.exceptions.HTTPError as e:
            logger.error("Erreur HTTP inventaire : %s — %s", e, r.text)
            return False
        except Exception as e:
            logger.error("Erreur inattendue inventaire : %s", e)
            return False

        if attempt < max_retries:
            time.sleep(retry_delay)

    logger.error("Envoi inventaire ECHOUE après %d tentatives", max_retries)
    return False


def run_inventory_once() -> int:
    load_config()
    software = collect_installed_software()
    print(f"Logiciels collectés: {len(software)}")
    if software[:5]:
        print("Exemples:")
        for item in software[:5]:
            print(f"- {item.get('name')}")
    return 0 if send_software_inventory() else 1

# ================= ENTRY POINT =================
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].lower() in {"inventory", "--inventory", "send-inventory"}:
        sys.exit(run_inventory_once())

    if len(sys.argv) == 1 and getattr(sys, "frozen", False):
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(NetworkAgent)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(NetworkAgent)
        
