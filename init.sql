CREATE DATABASE IF NOT EXISTS network_monitor
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON network_monitor.* TO 'novos_user'@'%';
FLUSH PRIVILEGES;
