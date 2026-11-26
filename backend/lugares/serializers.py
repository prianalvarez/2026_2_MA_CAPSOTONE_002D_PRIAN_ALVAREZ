from rest_framework import serializers

from .models import Lugar, Evento


class LugarSerializer(serializers.ModelSerializer):

    class Meta:
        model = Lugar
        fields = '__all__'


class EventoSerializer(serializers.ModelSerializer):

    lugar_nombre = serializers.CharField(
        source='lugar.nombre',
        read_only=True
    )

    organizacion = serializers.PrimaryKeyRelatedField(
        read_only=True
    )

    organizacion_nombre = serializers.SerializerMethodField()


    def get_organizacion_nombre(self, obj):

        if not obj.organizacion:
            return None

        perfil = getattr(
            obj.organizacion,
            'perfil',
            None
        )

        if perfil and perfil.nombre_negocio:
            return perfil.nombre_negocio

        return (
            obj.organizacion.first_name
            or obj.organizacion.username
        )


    class Meta:
        model = Evento
        fields = '__all__'
