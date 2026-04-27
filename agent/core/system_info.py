import socket
import uuid
import requests

def get_ip():
    try:
        return requests.get("https://api.ipify.org", timeout=5).text
    except:
        return "0.0.0.0"

def get_hostname():
    return socket.gethostname()

def get_mac():
    mac = uuid.getnode()
    return ':'.join(['{:02x}'.format((mac >> ele) & 0xff)
                     for ele in range(0, 8*6, 8)][::-1])