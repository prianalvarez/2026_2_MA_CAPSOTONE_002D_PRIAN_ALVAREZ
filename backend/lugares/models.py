from django.db import models
from django.contrib.auth.models import User


class Lugar(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField()
    direccion = models.CharField(max_length=200)
    comuna = models.CharField(max_length=100)
    categoria = models.CharField(max_length=100)
    imagen_url = models.URLField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


class Evento(models.Model):
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField()
    fecha = models.DateField()
    hora = models.TimeField()

    lugar = models.ForeignKey(
        Lugar,
        on_delete=models.CASCADE,
        related_name='eventos'
    )

    organizacion = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='eventos_publicados',
        blank=True,
        null=True
    )

    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo
