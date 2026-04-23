import socket
import uuid
import psutil
import getpass


def get_mac():
    mac = uuid.getnode()
    return ':'.join(['{:02x}'.format((mac >> ele) & 0xff)
                     for ele in range(0, 8*6, 8)][::-1])


def get_ip():
    try:
        return socket.gethostbyname(socket.gethostname())
    except:
        return "0.0.0.0"


def get_hostname():
    return socket.gethostname()


def get_user():
    return getpass.getuser()


def get_cpu():
    return psutil.cpu_percent(interval=1)


def get_ram():
    return psutil.virtual_memory().percent