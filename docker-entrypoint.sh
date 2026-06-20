#!/bin/sh
set -e

echo "============================================"
echo "  NOVOS Backend — Démarrage"
echo "============================================"

echo "⏳ Attente de MySQL sur ${DB_HOST}:${DB_PORT}..."
until nc -z "${DB_HOST:-mysql}" "${DB_PORT:-3306}"; do
    echo "   MySQL non disponible — nouvelle tentative dans 2s..."
    sleep 2
done
echo "✅ MySQL disponible."

echo "⏳ Attente de Redis sur ${REDIS_HOST}:${REDIS_PORT}..."
until nc -z "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}"; do
    echo "   Redis non disponible — nouvelle tentative dans 2s..."
    sleep 2
done
echo "✅ Redis disponible."

echo "🔄 Application des migrations..."
python manage.py migrate --noinput

echo "📦 Collecte des fichiers statiques..."
python manage.py collectstatic --noinput --clear

echo "👤 Vérification du superutilisateur..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='${DJANGO_SUPERUSER_USERNAME:-admin}').exists():
    User.objects.create_superuser(
        '${DJANGO_SUPERUSER_USERNAME:-admin}',
        '${DJANGO_SUPERUSER_EMAIL:-admin@novopharma.ma}',
        '${DJANGO_SUPERUSER_PASSWORD:-admin1234}'
    )
    print('Superutilisateur créé.')
else:
    print('Superutilisateur déjà existant.')
"

echo "🚀 Lancement de Daphne sur 0.0.0.0:8001..."
exec daphne \
    -b 0.0.0.0 \
    -p 8001 \
    backend.asgi:application
