from rest_framework import viewsets

from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated
)

from rest_framework.exceptions import PermissionDenied

from .models import Lugar, Evento
from .serializers import LugarSerializer, EventoSerializer

from usuarios.models import Perfil


class LugarViewSet(viewsets.ModelViewSet):

    queryset = Lugar.objects.all().order_by('nombre')
    serializer_class = LugarSerializer


class EventoViewSet(viewsets.ModelViewSet):

    queryset = (
        Evento.objects
        .select_related(
            'lugar',
            'organizacion'
        )
        .all()
        .order_by(
            'fecha',
            'hora'
        )
    )

    serializer_class = EventoSerializer


    def get_permissions(self):

        if self.action in [
            'list',
            'retrieve'
        ]:
            return [AllowAny()]

        return [IsAuthenticated()]


    def validar_organizacion_verificada(self, user):

        perfil = getattr(
            user,
            'perfil',
            None
        )

        if (
            not perfil
            or perfil.tipo_usuario != Perfil.NEGOCIO
        ):
            raise PermissionDenied(
                'Solo una organización puede realizar esta acción.'
            )

        if perfil.estado_negocio != 'VERIFICADO':
            raise PermissionDenied(
                'La organización debe estar verificada para publicar o modificar eventos.'
            )

        return perfil


    def perform_create(self, serializer):

        self.validar_organizacion_verificada(
            self.request.user
        )

        serializer.save(
            organizacion=self.request.user
        )


    def perform_update(self, serializer):

        self.validar_organizacion_verificada(
            self.request.user
        )

        evento = self.get_object()

        if evento.organizacion_id != self.request.user.id:
            raise PermissionDenied(
                'No puedes modificar eventos de otra organización.'
            )

        serializer.save()


    def perform_destroy(self, instance):

        self.validar_organizacion_verificada(
            self.request.user
        )

        if instance.organizacion_id != self.request.user.id:
            raise PermissionDenied(
                'No puedes eliminar eventos de otra organización.'
            )

        instance.delete()
