#!/usr/bin/env bash

set -o errexit

echo "=== Instalando dependencias ==="
pip install -r requirements.txt

echo "=== Archivos estaticos ==="
python manage.py collectstatic --no-input

echo "=== Migraciones ==="
python manage.py migrate

echo "=== Creando/actualizando Fundador ==="
python manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model

User = get_user_model()

username = os.getenv("DJANGO_SUPERUSER_USERNAME", "").strip()
email = os.getenv("DJANGO_SUPERUSER_EMAIL", "").strip()
password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "")

if not username or not password:
    print("AVISO: faltan DJANGO_SUPERUSER_USERNAME o DJANGO_SUPERUSER_PASSWORD")
else:
    user, created = User.objects.get_or_create(
        username=username
    )

    if email:
        user.email = email

    user.is_active = True
    user.is_staff = True
    user.is_superuser = True
    user.set_password(password)
    user.save()

    if created:
        print(f"Fundador creado correctamente: {username}")
    else:
        print(f"Fundador actualizado correctamente: {username}")
PY

echo "=== Build terminado ==="
