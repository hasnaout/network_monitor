# J'importe toutes les bibliothèques dont j'ai besoin
import socket        # Pour récupérer le nom du PC et l'adresse IP
import uuid          # Pour récupérer l'adresse MAC
import requests      # Pour envoyer les données au serveur
import time          # Pour faire des pauses entre chaque envoi
import subprocess    # Pour exécuter la commande ping
import getpass       # Pour récupérer l'utilisateur connecté
from datetime import datetime  # Pour l'horodatage
import psutil
import os            # Pour les variables d'environnement
from dotenv import load_dotenv  # Pour charger .env

# Je charge les variables d'environnement
load_dotenv()

# J'importe les bibliothèques pour créer un service Windows
import win32serviceutil
import win32service
import win32event
import servicemanager

# Je définit l'adresse du serveur central (configurable via .env)
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000/api/monitoring/ping/")

# Je définit l'intervalle d'envoi : toutes les 30 secondes
INTERVAL = 30

# ============================================================
# FONCTIONS DE COLLECTE DES INFORMATIONS DU POSTE
# ============================================================

def get_pc_name():
    # Je récupère le nom du PC depuis Windows
    return socket.gethostname()

def get_ip():
    # Je récupère l'adresse IP locale du PC
    try:
        # Je crée une connexion temporaire vers Google
        # pour trouver quelle interface réseau est utilisée
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except socket.error as e:
        # Si ça échoue, je retourne "inconnu"
        return "inconnu"

def get_mac():
    # Je récupère l'adresse MAC de la carte réseau
    # uuid.getnode() retourne l'adresse MAC en nombre entier
    # Je la convertis en format AA:BB:CC:DD:EE:FF
    mac = ':'.join(['{:02x}'.format(
        (uuid.getnode() >> elements) & 0xff)
        for elements in range(0, 2*6, 8)][::-1])
    return mac

def get_user():
    # Je récupère le nom de l'utilisateur actuellement connecté
    try:
        return getpass.getuser()
    except Exception as e:
        return "inconnu"

def check_connectivity():
    # Je vérifie la connectivité réseau de deux façons
    # comme demandé dans le cahier des charges

    # Méthode 1 : Par Ping vers le serveur central
    try:
        ping_result = subprocess.run(
            ["ping", "-n", "1", "localhost"],
            capture_output=True,
            timeout=5
        )
        # Si le ping répond → returncode = 0
        ping_ok = ping_result.returncode == 0
    except subprocess.TimeoutExpired:
        ping_ok = False
    except Exception as e:
        ping_ok = False

    # Méthode 2 : Par requête HTTP vers l'API
    try:
        http_result = requests.get(
            "http://localhost:8000/",
            timeout=5
        )
        # Si le serveur répond avec code 200 → OK
        http_ok = http_result.status_code == 200
    except requests.RequestException as e:
        http_ok = False
    except Exception as e:
        http_ok = False

    # Si les deux méthodes réussissent → réseau accessible
    if ping_ok and http_ok:
        return "Accessible"
    else:
        return "Non accessible"

def get_cpu():
    return psutil.cpu_percent(interval=1)

def get_ram():
    return psutil.virtual_memory().percent   


# ============================================================
# FONCTION D'ENVOI DU HEARTBEAT AU SERVEUR
# ============================================================

def send_heartbeat():
    # Je collecte toutes les informations du poste
   data = {
    "name": get_pc_name(),
    "mac_address": get_mac(),
    "ip_address": get_ip(),
    "connected_user": get_user(),
    "network_state": check_connectivity(),
    "timestamp": datetime.now().isoformat(),
    "cpu_usage": get_cpu(),    # ← nouveau
    "ram_usage": get_ram(),    # ← nouveau
}
    # J'essaie d'envoyer les données au serveur central
    try:
        requests.post(SERVER_URL, json=data, timeout=5)
        # Si l'envoi réussit → le serveur sait que ce PC est en ligne
    except requests.RequestException as e:
        # Si l'envoi échoue → le serveur détectera que ce PC
        # est déconnecté après 2 minutes sans signal
        pass

# ============================================================
# CLASSE DU SERVICE WINDOWS
# ============================================================

class NetworkAgentService(win32serviceutil.ServiceFramework):
    # Je définis le nom technique du service
    _svc_name_ = "NetworkAgent"
    
    # Je définis le nom affiché dans services.msc
    _svc_display_name_ = "Network Monitoring Agent"
    
    # Je définis la description affichée dans services.msc
    _svc_description_ = "Surveille la connectivité réseau et envoie des heartbeats"

    def __init__(self, args):
        # J'initialise le service Windows
        win32serviceutil.ServiceFramework.__init__(self, args)
        # Je crée un événement pour pouvoir arrêter le service proprement
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        # Cette fonction est appelée quand on arrête le service
        # Je signale que le service est en train de s'arrêter
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        self.running = False

    def SvcDoRun(self):
        # Cette fonction est le cœur du service
        # Elle s'exécute quand le service démarre
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        
        # Je lance une boucle infinie tant que le service tourne
        while self.running:
            # J'envoie le heartbeat au serveur
            send_heartbeat()
            # J'attends 30 secondes avant le prochain envoi
            time.sleep(INTERVAL)

# ============================================================
# POINT D'ENTRÉE DU PROGRAMME
# ============================================================

if __name__ == '__main__':
    # Je lance la gestion des commandes du service Windows
    # Cela permet d'utiliser : install, start, stop, remove
    win32serviceutil.HandleCommandLine(NetworkAgentService)