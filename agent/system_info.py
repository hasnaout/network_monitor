import socket
import uuid
import psutil
import getpass


def get_mac():
    mac = uuid.getnode()
    return ':'.join(['{:02x}'.format((mac >> i) & 0xff)
                     for i in range(0, 48, 8)][::-1])


def get_ip():
    try:
        return socket.gethostbyname(socket.gethostname())
    except:
        return "0.0.0.0"


def get_hostname():
    return socket.gethostname()

