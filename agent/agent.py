import json
import os
import socket
import time
import uuid
import sys
import logging
import subprocess
import tempfile
import traceback
import signal

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

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = get_base_dir()
CONFIG_FILE = os.path.join(BASE_DIR, "agent.config.json")
DEFAULT_LOG_FILE = os.path.join(BASE_DIR, "agent.log")
FALLBACK_LOG_DIR = os.path.join(os.getenv("ProgramData") or tempfile.gettempdir(), "NetworkAgent")
FALLBACK_LOG_FILE = os.path.join(FALLBACK_LOG_DIR, "agent.log")

if not os.path.exists(BASE_DIR):
    print(f"ERREUR: Répertoire introuvable: {BASE_DIR}")
    sys.exit(1)

logger = None

def setup_logger():
    log_file = DEFAULT_LOG_FILE
    try:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        with open(log_file, "a", encoding="utf-8"):
            pass
    except Exception:
        try:
            os.makedirs(FALLBACK_LOG_DIR, exist_ok=True)
            log_file = FALLBACK_LOG_FILE
            with open(log_file, "a", encoding="utf-8"):
                pass
        except Exception:
            log_file = None

    handlers = []
    if log_file:
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))
    else:
        handlers.append(logging.StreamHandler(sys.stderr))

    logging.basicConfig(
        handlers=handlers,
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    log = logging.getLogger("NetworkAgent")
    log.info("========== AGENT DÉMARRAGE ===========")
    if log_file:
        log.info(f"Répertoire de base: {BASE_DIR}")
        log.info(f"Fichier config: {CONFIG_FILE}")
        if log_file != DEFAULT_LOG_FILE:
            log.warning(
                "Impossible d'écrire dans %s, fallback vers %s",
                DEFAULT_LOG_FILE,
                log_file,
            )
    else:
        log.error("Impossible de configurer un fichier de log. Les messages seront envoyés sur stderr.")
    return log

try:
    logger = setup_logger()
except Exception as e:
    print(f"ERREUR lors de la configuration du logging: {e}")
    sys.exit(1)

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


def get_agent_headers() -> dict:
    token = _config.get("agent_token") or _config.get("AGENT_TOKEN", "")
    if token:
        return {"X-Agent-Token": token}
    return {}

def get_heartbeat_interval() -> int:
    return int(_config.get("heartbeat_interval_ms", 30_000))

def get_max_retries() -> int:
    return int(_config.get("max_retries", 3))

def get_retry_delay() -> int:
    return int(_config.get("retry_delay_s", 5))

def get_command_poll_interval() -> int:
    """Intervalle de polling des commandes en ms (défaut: 5s)."""
    return int(_config.get("command_poll_interval_ms", 5_000))

def get_inventory_interval() -> int:
    """Intervalle d'envoi de l'inventaire logiciels en ms (defaut: 1h)."""
    return int(_config.get("inventory_interval_ms", 3_600_000))

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


def _get_session_username() -> str:
    """Retourne l'utilisateur de session actif sur Windows."""
    try:
        import win32ts
        server = win32ts.WTS_CURRENT_SERVER_HANDLE
        sessions = win32ts.WTSEnumerateSessions(server)
        for session in sessions:
            if isinstance(session, (tuple, list)) and len(session) >= 3:
                session_id, _, state = session[0], session[1], session[2]
            else:
                session_id = getattr(session, 'SessionId', None)
                state = getattr(session, 'State', None)

            if state == win32ts.WTSActive and session_id not in (None, 0):
                username = win32ts.WTSQuerySessionInformation(server, session_id, win32ts.WTSUserName)
                domain = win32ts.WTSQuerySessionInformation(server, session_id, win32ts.WTSDomainName)
                if username:
                    return f"{domain}\\{username}" if domain else username
    except Exception as e:
        logger.debug("Erreur détection utilisateur session Windows: %s", e)

    try:
        import getpass
        user = getpass.getuser()
        if user:
            return user
    except Exception:
        pass

    return os.environ.get('USERNAME') or os.environ.get('USER') or "Unknown"


def build_payload() -> dict:
    return {
        "name": get_hostname(),
        "mac_address": get_mac(),
        "ip_address": get_ip(),
        "session_user": _get_session_username(),
    }

# ================= HEARTBEAT =================
def send_heartbeat() -> bool:
    url = get_server_url() + "/api/heartbeat/ping/"
    payload = build_payload()
    logger.debug(f"Payload: {payload}")
    max_retries = get_max_retries()
    retry_delay = get_retry_delay()

    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(url, json=payload, headers=get_agent_headers(), timeout=5)
            r.raise_for_status()
            logger.info("Heartbeat OK -> %s", url)
            return True
        except requests.exceptions.ConnectionError:
            logger.warning("Tentative %d/%d — serveur injoignable (%s)", attempt, max_retries, url)
        except requests.exceptions.Timeout:
            logger.warning("Tentative %d/%d — timeout", attempt, max_retries)
        except requests.exceptions.HTTPError as e:
            logger.error("Erreur HTTP %s - Réponse: %s", e, r.text)
            return False
        except Exception as e:
            logger.error("Erreur inattendue : %s", e)
            return False
        if attempt < max_retries:
            time.sleep(retry_delay)

    logger.error("Heartbeat ECHOUE apres %d tentatives", max_retries)
    return False

# ================= REMOTE COMMAND EXECUTION =================

COMMAND_CWD_MARKER = "__NETWORK_AGENT_CWD__="
_command_session_cwd = None


def get_default_command_cwd() -> str:
    configured_cwd = (
        _config.get("remote_command_initial_cwd")
        or _config.get("command_initial_cwd")
    )
    if configured_cwd:
        candidate = os.path.abspath(os.path.expandvars(os.path.expanduser(configured_cwd)))
        if os.path.isdir(candidate):
            return candidate
        logger.warning("remote_command_initial_cwd invalide ignore: %s", configured_cwd)

    if os.name == "nt":
        system_drive = os.environ.get("SystemDrive") or "C:"
        candidate = system_drive + "\\"
        if os.path.isdir(candidate):
            return candidate

    home = os.path.expanduser("~")
    return home if os.path.isdir(home) else os.getcwd()


def get_command_session_cwd() -> str:
    global _command_session_cwd
    if not _command_session_cwd or not os.path.isdir(_command_session_cwd):
        _command_session_cwd = get_default_command_cwd()
        logger.info("Remote command cwd initialise: %s", _command_session_cwd)
    return _command_session_cwd


def build_shell_command(command: str, shell_type: str):
    shell_name = shell_type.lower()
    if os.name == "nt":
        if shell_name == "powershell":
            wrapped = (
                "$__networkAgentRc = 0; "
                "try { "
                f"& {{ {command} }} | Out-String -Stream; "
                "if ($global:LASTEXITCODE -ne $null) { $__networkAgentRc = $global:LASTEXITCODE } "
                "} catch { Write-Error $_; $__networkAgentRc = 1 }; "
                f"Write-Output ('{COMMAND_CWD_MARKER}' + (Get-Location).ProviderPath); "
                "exit $__networkAgentRc"
            )
            return ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", wrapped], False

        wrapped = (
            f"{command} "
            '& set "__NETWORK_AGENT_RC=!ERRORLEVEL!" '
            f"& echo {COMMAND_CWD_MARKER}!CD! "
            '& exit /b !__NETWORK_AGENT_RC!'
        )
        return ["cmd.exe", "/d", "/v:on", "/s", "/c", wrapped], False

    wrapped = (
        f"{command}\n"
        "__network_agent_rc=$?\n"
        f'printf "\\n{COMMAND_CWD_MARKER}%s\\n" "$PWD"\n'
        "exit $__network_agent_rc"
    )
    return wrapped, True


def split_command_output(stdout: str) -> tuple[str, str | None]:
    cwd = None
    cleaned_lines = []
    for line in stdout.splitlines():
        if line.startswith(COMMAND_CWD_MARKER):
            cwd_candidate = line[len(COMMAND_CWD_MARKER):].strip()
            if cwd_candidate:
                cwd = cwd_candidate
        else:
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip(), cwd


def is_command_cancel_requested(command_id: int | None) -> bool:
    if not command_id:
        return False

    url = get_server_url() + f"/api/commands/{command_id}/cancel-status/"
    params = {"mac_address": get_mac()}
    try:
        r = requests.get(url, params=params, headers=get_agent_headers(), timeout=3)
        r.raise_for_status()
        return bool(r.json().get("cancel_requested"))
    except Exception as e:
        logger.debug("Impossible de vérifier l'annulation commande #%s: %s", command_id, e)
        return False


def terminate_process_tree(process: subprocess.Popen):
    if process.poll() is not None:
        return

    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
        else:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    except Exception as e:
        logger.warning("Erreur arrêt arbre processus PID %s: %s", process.pid, e)
        try:
            process.kill()
        except Exception:
            pass


def fetch_pending_commands() -> list:
    """
    Interroge le serveur pour récupérer les commandes en attente pour cet agent.
    Endpoint : GET /api/commands/pending/?mac_address=<MAC>
    Réponse  : [{"id": 1, "command": "shutdown /r", "timeout": 30}, ...]
    """
    url = get_server_url() + "/api/commands/pending/"
    params = {"mac_address": get_mac()}
    try:
        r = requests.get(url, params=params, headers=get_agent_headers(), timeout=5)
        r.raise_for_status()
        commands = r.json()
        if commands:
            logger.info("Commandes reçues : %d commande(s)", len(commands))
        return commands if isinstance(commands, list) else []
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response is not None else None
        if status_code == 404:
            logger.debug("Endpoint commandes indisponible : %s", url)
            return []
        logger.error("Erreur HTTP fetch_pending_commands : %s", e)
        return []
    except requests.exceptions.ConnectionError:
        logger.debug("Serveur injoignable lors du fetch des commandes")
        return []
    except requests.exceptions.Timeout:
        logger.warning("Timeout lors du fetch des commandes")
        return []
    except Exception as e:
        logger.error("Erreur fetch_pending_commands : %s", e)
        return []


def is_process_admin() -> bool:
    if os.name != "nt":
        return False
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception as e:
        logger.debug("Impossible de vérifier les privilèges administrateur : %s", e)
        return False


def execute_command(command: str, timeout: int = 30, shell_type: str = "cmd", command_id: int | None = None) -> dict:
    """
    Exécute une commande shell et retourne stdout, stderr et le code de retour.
    Le paramètre timeout évite de bloquer l'agent indéfiniment.
    shell_type peut être "cmd" ou "powershell"
    """
    logger.info("Execution commande : %s (shell=%s, timeout=%ds)", command, shell_type, timeout)

    if os.name == "nt" and not is_process_admin():
        logger.warning(
            "Remote command exécutée sans privilèges administrateur. "
            "Assurez-vous que l'agent est installé et exécuté comme service Windows avec des droits élevés."
        )

    creationflags = 0
    startupinfo = None
    cwd = get_command_session_cwd()
    shell_name = shell_type.lower()
    exec_command, shell = build_shell_command(command, shell_name)

    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE
    else:
        creationflags = 0

    try:
        logger.debug("Execution de la commande via %s depuis %s : %s", shell_type, cwd, command)
        process = subprocess.Popen(
            exec_command,
            shell=shell,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=cwd,
            creationflags=creationflags,
            startupinfo=startupinfo,
            start_new_session=(os.name != "nt"),
        )

        started_at = time.monotonic()
        was_cancelled = False
        while process.poll() is None:
            if time.monotonic() - started_at > timeout:
                terminate_process_tree(process)
                stdout, stderr = process.communicate(timeout=5)
                logger.error("Commande TIMEOUT apres %ds : %s", timeout, command)
                return {
                    "stdout": split_command_output(stdout or "")[0],
                    "stderr": (stderr or "").strip() or f"Timeout après {timeout} secondes",
                    "returncode": -1,
                    "status": "timeout",
                    "working_directory": get_command_session_cwd(),
                }

            if is_command_cancel_requested(command_id):
                was_cancelled = True
                terminate_process_tree(process)
                break

            time.sleep(1)

        stdout_data, stderr_data = process.communicate(timeout=10)
        if was_cancelled:
            logger.warning("Commande #%s annulée par l'admin : %s", command_id, command)
            return {
                "stdout": split_command_output(stdout_data or "")[0],
                "stderr": (stderr_data or "").strip() or "Commande annulée par l'administrateur.",
                "returncode": -1,
                "status": "cancelled",
                "working_directory": get_command_session_cwd(),
            }

        result_stdout = stdout_data or ""
        result_stderr = stderr_data or ""
        stdout, next_cwd = split_command_output(result_stdout)
        if next_cwd and os.path.isdir(next_cwd):
            global _command_session_cwd
            _command_session_cwd = os.path.abspath(next_cwd)
            logger.info("Remote command cwd mis a jour: %s", _command_session_cwd)

        output = {
            "stdout": stdout,
            "stderr": result_stderr.strip(),
            "returncode": process.returncode,
            "status": "success" if process.returncode == 0 else "error",
            "working_directory": _command_session_cwd,
        }
        logger.info("Commande terminée — code retour : %d", process.returncode)
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
            "working_directory": get_command_session_cwd(),
        }
    except Exception as e:
        logger.error("Erreur execution commande '%s' : %s", command, e)
        return {
            "stdout": "",
            "stderr": str(e),
            "returncode": -1,
            "status": "exception",
            "working_directory": get_command_session_cwd(),
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
        "working_directory": result.get("working_directory", ""),
    }
    try:
        r = requests.post(url, json=payload, headers=get_agent_headers(), timeout=5)
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
        shell_type  = cmd_entry.get("shell", "cmd")  # Par défaut cmd
        timeout     = int(cmd_entry.get("timeout", 30))

        if not command_id or not command_str:
            logger.warning("Commande invalide reçue : %s", cmd_entry)
            continue

        logger.info("Traitement commande #%d : %s (shell=%s)", command_id, command_str, shell_type)
        result = execute_command(command_str, timeout=timeout, shell_type=shell_type, command_id=command_id)
        report_command_result(command_id, result)



# ================= SOFTWARE INVENTORY =================

def collect_installed_software() -> list:
    """
    Collecte la liste des logiciels installés via le registre Windows.
    Parcourt les deux ruches (64-bit et 32-bit) pour être exhaustif.
    Retourne une liste de dicts {name, version, publisher, install_date}.
    """
    import winreg

    software_list = []
    registry_paths = [
        (winreg.HKEY_CURRENT_USER,  r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ]

    seen = set()  # éviter les doublons entre ruches

    for hive, path in registry_paths:
        try:
            root_key = winreg.OpenKey(hive, path, 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY)
        except FileNotFoundError:
            continue
        except Exception as e:
            logger.warning("Impossible d'ouvrir la ruche %s\\%s : %s", hive, path, e)
            continue

        index = 0
        while True:
            try:
                subkey_name = winreg.EnumKey(root_key, index)
                index += 1
            except OSError:
                break  # plus de sous-clés

            try:
                subkey = winreg.OpenKey(root_key, subkey_name)

                def get_val(name):
                    try:
                        return winreg.QueryValueEx(subkey, name)[0]
                    except FileNotFoundError:
                        return ""

                name      = get_val("DisplayName").strip()
                version   = get_val("DisplayVersion").strip()
                publisher = get_val("Publisher").strip()
                inst_date = get_val("InstallDate").strip()  # format YYYYMMDD ou vide

                winreg.CloseKey(subkey)

                # Ignorer les entrées sans nom (mises à jour Windows, clés vides...)
                if not name:
                    continue

                uid = f"{name}|{version}"
                if uid in seen:
                    continue
                seen.add(uid)

                software_list.append({
                    "name":         name,
                    "version":      version,
                    "publisher":    publisher,
                    "install_date": inst_date,
                })

            except Exception as e:
                logger.debug("Erreur lecture sous-clé %s : %s", subkey_name, e)

        winreg.CloseKey(root_key)

    logger.info("Inventaire logiciels : %d entrées collectées", len(software_list))
    return software_list


def send_software_inventory() -> bool:
    """
    Envoie l'inventaire complet au serveur.
    Endpoint : POST /api/inventory/software/
    Body     : { mac_address, hostname, software: [...] }
    """
    url     = get_server_url() + "/api/inventory/software/"
    payload = {
        "mac_address": get_mac(),
        "hostname":    get_hostname(),
        "software":    collect_installed_software(),
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
    
# ================= APPLICATION USAGE TRACKING =================

from collections import defaultdict
from datetime import date as _date


def _get_foreground_process_name() -> str:
    """
    Retourne le nom de l'exécutable de la fenêtre au premier plan.
    Ex : 'chrome.exe', 'Code.exe', 'explorer.exe'
    Retourne 'Unknown' en cas d'échec.
    """
    try:
        import win32gui
        import win32process
        import win32con
        import win32api

        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return "Unknown"

        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        access = win32con.PROCESS_QUERY_LIMITED_INFORMATION | win32con.PROCESS_VM_READ
        handle = win32api.OpenProcess(access, False, pid)
        try:
            exe_path = win32process.GetModuleFileNameEx(handle, 0)
        finally:
            win32api.CloseHandle(handle)
        return os.path.basename(exe_path)

    except Exception as e:
        logger.debug("Erreur détection fenêtre active : %s", e)
        return "Unknown"


class AppUsageTracker:
    """
    Accumule le temps d'utilisation par application en mémoire.
    tick() à chaque poll, flush() à chaque envoi.
    Si l'envoi échoue, les données sont remises dans l'accumulateur.
    """

    def __init__(self):
        self._data: dict = defaultdict(lambda: defaultdict(int))

    def tick(self, seconds: int):
        """Identifie l'app active et ajoute seconds à son compteur."""
        if seconds <= 0:
            return
        app   = _get_foreground_process_name()
        today = str(_date.today())
        self._data[today][app] += seconds

    def flush(self) -> list:
        """Vide l'accumulateur et retourne la liste des usages."""
        if not self._data:
            return []
        result = []
        for date_str, apps in self._data.items():
            for app_name, secs in apps.items():
                if secs > 0:
                    result.append({
                        "app_name":         app_name,
                        "date":             date_str,
                        "duration_seconds": secs,
                    })
        self._data.clear()
        return result

    def restore(self, usages: list):
        """Remet des données dans l'accumulateur après un échec d'envoi."""
        for item in usages:
            self._data[item["date"]][item["app_name"]] += item["duration_seconds"]


def send_app_usage(tracker: "AppUsageTracker") -> bool:
    """
    Vide le tracker et envoie les usages au serveur.
    Endpoint : POST /api/usage/apps/
    Body     : { mac_address, hostname, usages: [...] }
    En cas d'échec total, les données sont restaurées dans le tracker.
    """
    usages = tracker.flush()
    if not usages:
        logger.debug("AppUsage : aucune donnée à envoyer")
        return True

    url     = get_server_url() + "/api/usage/apps/"
    payload = {
        "mac_address": get_mac(),
        "hostname":    get_hostname(),
        "usages":      usages,
    }

    logger.info("Envoi AppUsage (%d entrées) → %s", len(usages), url)

    for attempt in range(1, get_max_retries() + 1):
        try:
            r = requests.post(url, json=payload, headers=get_agent_headers(), timeout=10)
            r.raise_for_status()
            logger.info("AppUsage envoyé avec succès")
            return True
        except requests.exceptions.ConnectionError:
            logger.warning("AppUsage tentative %d/%d — serveur injoignable", attempt, get_max_retries())
        except requests.exceptions.Timeout:
            logger.warning("AppUsage tentative %d/%d — timeout", attempt, get_max_retries())
        except requests.exceptions.HTTPError as e:
            logger.error("AppUsage erreur HTTP : %s", e)
            tracker.restore(usages)
            return False
        except Exception as e:
            logger.error("AppUsage erreur inattendue : %s", e)
            tracker.restore(usages)
            return False

        if attempt < get_max_retries():
            time.sleep(get_retry_delay())

    logger.error("AppUsage ECHOUE après %d tentatives — données conservées", get_max_retries())
    tracker.restore(usages)
    return False


def get_usage_send_interval() -> int:
    """Intervalle d'envoi des usages en ms (défaut : 5 min)."""
    return int(_config.get("usage_send_interval_ms", 300_000))




# ================= SERVICE =================
class NetworkAgent(win32serviceutil.ServiceFramework):
    _svc_name_         = "NetworkAgent"
    _svc_display_name_ = "Network Monitoring Agent"
    _svc_description_  = "Agent léger de supervision réseau avec exécution de commandes à distance"

    def __init__(self, args):
        super().__init__(args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running    = True
        self._heartbeat_accumulator  = 0  # ms depuis le dernier heartbeat
        self._inventory_accumulator  = 0  # ms depuis le dernier inventaire
        self._usage_accumulator      = 0  # ms depuis le dernier envoi usage
        self._tracker = AppUsageTracker()  # accumulateur app usage

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.running = False
        win32event.SetEvent(self.stop_event)
        logger.info("Service arrêté proprement")

    def SvcDoRun(self):
     try:
        servicemanager.LogInfoMsg("NetworkAgent: SvcDoRun démarré")
        self.ReportServiceStatus(win32service.SERVICE_RUNNING)
        servicemanager.LogInfoMsg("NetworkAgent: SERVICE_RUNNING signalé")

        load_config()
        logger.info("Service démarré — URL : %s", get_server_url())

        send_heartbeat()
        self._heartbeat_accumulator = 0
        self._inventory_accumulator = get_inventory_interval()  # déclenche au 1er cycle
        self._usage_accumulator     = 0

        while self.running:
            poll_interval      = get_command_poll_interval()
            heartbeat_interval = get_heartbeat_interval()
            inventory_interval = get_inventory_interval()

            result = win32event.WaitForSingleObject(self.stop_event, poll_interval)
            if result == win32event.WAIT_OBJECT_0:
                break

            process_pending_commands()

            self._heartbeat_accumulator += poll_interval
            self._inventory_accumulator += poll_interval

            if self._heartbeat_accumulator >= heartbeat_interval:
                send_heartbeat()
                self._heartbeat_accumulator = 0

            if self._inventory_accumulator >= inventory_interval:
                send_software_inventory()
                self._inventory_accumulator = 0

            self._tracker.tick(poll_interval // 1000)
            self._usage_accumulator += poll_interval
            usage_interval = get_usage_send_interval()
            if self._usage_accumulator >= usage_interval:
                send_app_usage(self._tracker)
                self._usage_accumulator = 0

     except Exception as e:
        logger.exception("Erreur fatale dans SvcDoRun")
        servicemanager.LogErrorMsg("NetworkAgent FATAL: " + traceback.format_exc())
        raise
# ================= ENTRY POINT =================
if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(NetworkAgent)
