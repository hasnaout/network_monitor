import logging
import os

log_path = os.path.join(os.path.dirname(__file__), "agent.log")

logging.basicConfig(
    filename=log_path,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def log(msg):
    print(msg)
    logging.info(msg)

def error(msg):
    print(msg)
    logging.error(msg)