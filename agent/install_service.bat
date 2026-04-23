@echo off

echo Installation du service NetworkAgent...

python agent.py install
python agent.py start

echo Service installé et démarré !
pause