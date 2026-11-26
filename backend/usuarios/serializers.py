from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Perfil


# =====================================================
# UTILIDADES RUT CHILENO
# =====================================================

def normalizar_rut(rut):

    return (
        rut
        .replace('.', '')
        .replace('-', '')
        .strip()
        .upper()
    )


def validar_rut_chileno(rut):

    rut = normalizar_rut(rut)

    if len(rut) < 2:
        return False

    cuerpo = rut[:-1]
    dv = rut[-1]

    if not cuerpo.isdigit():
        return False

    suma = 0
    factor = 2

    for digito in reversed(cuerpo):

        suma += int(digito) * factor

        factor += 1

        if factor > 7:
            factor = 2

    resultado = 11 - (suma % 11)

    if resultado == 11:
        dv_esperado = '0'

    elif resultado == 10:
        dv_esperado = 'K'

    else:
        dv_esperado = str(resultado)

    return dv == dv_esperado


# =====================================================
# SERIALIZER DE REGISTRO
# =====================================================

class RegistroSerializer(
    serializers.Serializer
):

    nombre = serializers.CharField(
        max_length=150
    )

    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True,
        min_length=6
    )

    tipo_usuario = serializers.ChoiceField(
        choices=Perfil.TIPO_USUARIO_CHOICES
    )

    rango_edad = serializers.ChoiceField(
        choices=Perfil.RANGO_EDAD_CHOICES,
        required=False,
        allow_blank=True
    )

    comuna = serializers.CharField(
        required=False,
        allow_blank=True
    )

    intereses = serializers.CharField(
        required=False,
        allow_blank=True
    )

    nombre_negocio = serializers.CharField(
        required=False,
        allow_blank=True
    )

    rut_negocio = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=12
    )


    # =================================================
    # VALIDAR EMAIL
    # =================================================

    def validate_email(
        self,
        value
    ):

        email = (
            value
            .strip()
            .lower()
        )

        if User.objects.filter(
            email__iexact=email
        ).exists():

            raise serializers.ValidationError(
                'Ya existe una cuenta asociada a este correo.'
            )

        return email


    # =================================================
    # VALIDAR RUT
    # =================================================

    def validate_rut_negocio(
        self,
        value
    ):

        if not value:
            return ''

        rut_limpio = normalizar_rut(
            value
        )


        if not validar_rut_chileno(
            rut_limpio
        ):

            raise serializers.ValidationError(
                'El RUT ingresado no es válido.'
            )


        rut_formateado = (
            rut_limpio[:-1]
            +
            '-'
            +
            rut_limpio[-1]
        )


        if Perfil.objects.filter(
            rut_negocio=rut_formateado
        ).exists():

            raise serializers.ValidationError(
                'Este RUT ya está registrado.'
            )


        return rut_formateado


    # =================================================
    # VALIDACIONES GENERALES
    # =================================================

    def validate(
        self,
        data
    ):

        tipo_usuario = (
            data['tipo_usuario']
        )


        if (
            tipo_usuario
            == Perfil.NEGOCIO
        ):

            if not data.get(
                'nombre_negocio'
            ):

                raise serializers.ValidationError({
                    'nombre_negocio':
                        'Debes indicar el nombre de la organización.'
                })


            if not data.get(
                'rut_negocio'
            ):

                raise serializers.ValidationError({
                    'rut_negocio':
                        'Debes indicar el RUT de la organización.'
                })


        return data


    # =================================================
    # CREAR USUARIO
    # =================================================

    def create(
        self,
        validated_data
    ):

        email = (
            validated_data[
                'email'
            ]
        )


        user = (
            User.objects.create_user(
                username=email,
                email=email,
                password=
                    validated_data[
                        'password'
                    ],
                first_name=
                    validated_data[
                        'nombre'
                    ]
            )
        )


        tipo_usuario = (
            validated_data[
                'tipo_usuario'
            ]
        )


        estado_negocio = (

            'PENDIENTE'

            if (
                tipo_usuario
                == Perfil.NEGOCIO
            )

            else 'NO_APLICA'
        )


        rut_negocio = (
            validated_data.get(
                'rut_negocio'
            )
            or None
        )


        Perfil.objects.create(

            usuario=user,

            tipo_usuario=
                tipo_usuario,

            rango_edad=
                validated_data.get(
                    'rango_edad',
                    ''
                ),

            comuna=
                validated_data.get(
                    'comuna',
                    ''
                ),

            intereses=
                validated_data.get(
                    'intereses',
                    ''
                ),

            nombre_negocio=
                validated_data.get(
                    'nombre_negocio',
                    ''
                ),

            rut_negocio=
                rut_negocio,

            estado_negocio=
                estado_negocio
        )


        return user