import socket
import uuid
import getpass
import psutil
import subprocess

def get_hostname():
    return socket.gethostname()

def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "0.0.0.0"

def get_mac():
    mac = uuid.getnode()
    return ':'.join(['{:02x}'.format((mac >> ele) & 0xff)
                     for ele in range(0, 8*6, 8)][::-1])

def get_user():
    try:
        return getpass.getuser()
    except:
        return "inconnu"

def get_cpu():
    try:
        return psutil.cpu_percent(interval=1)
    except:
        return 0.0

def get_ram():
    try:
        return psutil.virtual_memory().percent
    except:
        return 0.0

def check_network():
    try:
        result = subprocess.run(
            ["ping", "-n", "1", "8.8.8.8"],
            capture_output=True,
            timeout=5
        )
        return "Accessible" if result.returncode == 0 else "Non accessible"
    except:
        return "Non accessible"