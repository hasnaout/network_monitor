NetworkAgent - Installation client

1. Modifier agent.config.json si necessaire:
   - server_url doit pointer vers le serveur Django.
   - Exemple: http://192.168.120.237:8000

2. Installer:
   - Clic droit sur install.bat
   - Executer en tant qu'administrateur

3. Verifier:
   - Ouvrir services.msc
   - Chercher "Network Monitoring Agent"
   - Le type de demarrage doit etre Automatique
   - Le statut doit etre En cours d'execution

4. Logs:
   - C:\Program Files\NetworkAgent\agent.log

5. Desinstaller:
   - Clic droit sur C:\Program Files\NetworkAgent\uninstall.bat
   - Executer en tant qu'administrateur
