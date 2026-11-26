import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  DomSanitizer,
  SafeResourceUrl
} from '@angular/platform-browser';


interface Lugar {
  id: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  comuna: string;
  categoria: string;
  imagen_url: string | null;
  activo: boolean;
  fecha_creacion: string;
}


interface Evento {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  lugar: number;
  lugar_nombre: string;
  organizacion: number | null;
  organizacion_nombre: string | null;
  activo: boolean;
  fecha_creacion: string;
}


interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;

  tipo_usuario:
    | 'PERSONA'
    | 'NEGOCIO'
    | 'ADMIN';

  estado_negocio: string | null;
  nombre_negocio: string | null;
  rut_negocio: string | null;
}


interface AuthResponse {
  token: string;
  usuario: UsuarioSesion;
  mensaje?: string;
}


type Vista =
  | 'inicio'
  | 'eventos'
  | 'negocios'
  | 'admin'
  | 'fundador'
  | 'login'
  | 'registro'
  | 'perfil';


@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  private http = inject(HttpClient);

  private sanitizer =
    inject(DomSanitizer);


  // =====================================================
  // API
  // =====================================================

  // HOY usamos backend local.
  // Cuando terminemos y subamos a Render,
  // cambiaremos solamente esta línea.
  // Backend local durante desarrollo y backend público en Render.
  private readonly API_URL =
    (
      window.location.hostname === 'localhost'
      ||
      window.location.hostname === '127.0.0.1'
    )
      ? 'http://127.0.0.1:8000/api'
      : 'https://two026-2-ma-capsotone-002d-prian-alvarez.onrender.com/api';


  // =====================================================
  // DATOS GENERALES
  // =====================================================

  lugares = signal<Lugar[]>([]);
  eventos = signal<Evento[]>([]);

  cargando = signal(true);
  error = signal('');

  lugarSeleccionado =
    signal<Lugar | null>(null);

  vista = signal<Vista>('inicio');

  mensajeNegocio = signal('');

  eventoEditando =
    signal<Evento | null>(null);


  // =====================================================
  // EXPLORACIÓN Y FILTROS
  // =====================================================

  busqueda = signal('');

  mostrarSugerencias =
    signal(false);

  categoriaSeleccionada =
    signal('TODOS');

  mapaUrl =
    signal<SafeResourceUrl | null>(null);


  actualizarBusqueda(
    valor: string
  ): void {

    this.busqueda.set(valor);

    this.mostrarSugerencias.set(
      valor.trim().length > 0
    );
  }


  activarSugerencias(): void {

    if (this.busqueda().trim()) {
      this.mostrarSugerencias.set(true);
    }
  }


  buscar(
    valor: string
  ): void {

    this.busqueda.set(valor.trim());

    this.mostrarSugerencias.set(false);

    setTimeout(() => {

      document
        .getElementById('resultados-lugares')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    }, 0);
  }


  sugerenciasLugares(): Lugar[] {

    const consulta =
      this.normalizarTexto(
        this.busqueda().trim()
      );

    if (!consulta) {
      return [];
    }


    return this.lugares()
      .filter(
        lugar => lugar.activo
      )
      .filter(lugar => {

        const contenido =
          this.normalizarTexto(
            [
              lugar.nombre,
              lugar.comuna,
              lugar.categoria,
              lugar.direccion
            ].join(' ')
          );

        return contenido.includes(
          consulta
        );
      })
      .sort((a, b) => {

        const nombreA =
          this.normalizarTexto(a.nombre);

        const nombreB =
          this.normalizarTexto(b.nombre);

        const comunaA =
          this.normalizarTexto(a.comuna);

        const comunaB =
          this.normalizarTexto(b.comuna);


        const puntaje = (
          nombre: string,
          comuna: string
        ): number => {

          if (nombre.startsWith(consulta)) {
            return 0;
          }

          if (nombre.includes(consulta)) {
            return 1;
          }

          if (comuna.startsWith(consulta)) {
            return 2;
          }

          if (comuna.includes(consulta)) {
            return 3;
          }

          return 4;
        };


        const puntajeA =
          puntaje(nombreA, comunaA);

        const puntajeB =
          puntaje(nombreB, comunaB);


        if (puntajeA !== puntajeB) {
          return puntajeA - puntajeB;
        }

        return a.nombre.localeCompare(
          b.nombre,
          'es'
        );
      })
      .slice(0, 8);
  }


  elegirSugerencia(
    lugar: Lugar
  ): void {

    this.busqueda.set(
      lugar.nombre
    );

    this.mostrarSugerencias.set(false);

    this.verLugar(lugar);
  }


  seleccionarCategoria(
    categoria: string
  ): void {

    this.mostrarSugerencias.set(false);

    this.categoriaSeleccionada.set(
      categoria
    );

    setTimeout(() => {

      document
        .getElementById('resultados-lugares')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    }, 0);
  }


  limpiarFiltros(): void {

    this.busqueda.set('');

    this.mostrarSugerencias.set(false);

    this.categoriaSeleccionada.set(
      'TODOS'
    );
  }


  private normalizarTexto(
    texto: string
  ): string {

    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }


  private coincideCategoria(
    lugar: Lugar,
    filtro: string
  ): boolean {

    if (filtro === 'TODOS') {
      return true;
    }

    const texto = this.normalizarTexto(
      [
        lugar.nombre,
        lugar.categoria,
        lugar.descripcion,
        lugar.comuna
      ].join(' ')
    );


    const grupos:
      Record<string, string[]> = {

      CULTURA: [
        'museo',
        'arte',
        'cultural',
        'teatro',
        'exposicion',
        'biblioteca',
        'casa museo'
      ],

      PARQUES: [
        'parque',
        'cerro',
        'jardin',
        'naturaleza',
        'mirador'
      ],

      GASTRONOMIA: [
        'restaurante',
        'gastronom',
        'mercado',
        'fuente de soda',
        'sanguch',
        'comida',
        'food truck',
        'picada',
        'cocina'
      ],

      BARES_CAFES: [
        'bar',
        'cafe',
        'cafeter',
        'cervec',
        'brewpub',
        'choper',
        'restobar',
        'coctel'
      ],

      PATRIMONIO: [
        'histor',
        'patrimonio',
        'palacio',
        'barrio',
        'plaza',
        'iglesia',
        'catedral',
        'monumento',
        'arquitectura'
      ]
    };


    return (
      grupos[filtro]
      ?.some(
        termino =>
          texto.includes(termino)
      )
      ?? true
    );
  }


  lugaresFiltrados(): Lugar[] {

    const consulta =
      this.normalizarTexto(
        this.busqueda().trim()
      );

    const categoria =
      this.categoriaSeleccionada();


    return this.lugares()
      .filter(
        lugar => lugar.activo
      )
      .filter(
        lugar =>
          this.coincideCategoria(
            lugar,
            categoria
          )
      )
      .filter(lugar => {

        if (!consulta) {
          return true;
        }

        const contenido =
          this.normalizarTexto(
            [
              lugar.nombre,
              lugar.descripcion,
              lugar.direccion,
              lugar.comuna,
              lugar.categoria
            ].join(' ')
          );

        return contenido.includes(
          consulta
        );
      });
  }


  categoriaVisible(): string {

    switch (
      this.categoriaSeleccionada()
    ) {

      case 'CULTURA':
        return 'Cultura';

      case 'PARQUES':
        return 'Parques y naturaleza';

      case 'GASTRONOMIA':
        return 'Gastronomía';

      case 'BARES_CAFES':
        return 'Bares y cafés';

      case 'PATRIMONIO':
        return 'Patrimonio';

      default:
        return 'Todos los lugares';
    }
  }


  private consultaMapa(
    lugar: Lugar
  ): string {

    return [
      lugar.nombre,
      lugar.direccion,
      lugar.comuna,
      'Santiago',
      'Chile'
    ]
      .filter(Boolean)
      .join(', ');
  }


  private actualizarMapa(
    lugar: Lugar
  ): void {

    const consulta =
      encodeURIComponent(
        this.consultaMapa(lugar)
      );

    const url =
      `https://www.google.com/maps?q=${consulta}&output=embed`;

    this.mapaUrl.set(
      this.sanitizer
        .bypassSecurityTrustResourceUrl(
          url
        )
    );
  }


  abrirEnMapa(
    lugar: Lugar
  ): void {

    const consulta =
      encodeURIComponent(
        this.consultaMapa(lugar)
      );

    const url =
      `https://www.google.com/maps/search/?api=1&query=${consulta}`;

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }


  // =====================================================
  // AUTENTICACIÓN
  // =====================================================

  token = signal<string | null>(
    localStorage.getItem('planify_token')
  );

  usuarioActual =
    signal<UsuarioSesion | null>(null);

  cargandoAuth = signal(false);

  mensajeAuth = signal('');


  // =====================================================
  // TIPO DE ACCESO
  // =====================================================

  tipoAcceso =
    signal<'PERSONA' | 'NEGOCIO'>(
      'PERSONA'
    );


  seleccionarTipoAcceso(
    tipo: 'PERSONA' | 'NEGOCIO'
  ): void {

    this.tipoAcceso.set(tipo);

    this.mensajeAuth.set('');
  }


  tipoRegistro =
    signal<'PERSONA' | 'NEGOCIO'>(
      'PERSONA'
    );


  seleccionarTipoRegistro(
    tipo: 'PERSONA' | 'NEGOCIO'
  ): void {

    this.tipoRegistro.set(tipo);

    this.mensajeAuth.set('');
  }


  private esRutaFundador(): boolean {

    const ruta = (
      window.location.pathname
      .replace(/\/+$/, '')
      .toLowerCase()
    );

    return ruta === '/fundador';
  }


  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit(): void {

    this.obtenerLugares();

    this.obtenerEventos();


    if (this.esRutaFundador()) {

      this.vista.set('fundador');

      if (this.token()) {
        this.recuperarSesion();
      }

      return;
    }


    if (this.token()) {
      this.recuperarSesion();
    }
  }


  // =====================================================
  // LUGARES
  // =====================================================

  obtenerLugares(): void {

    this.http
      .get<Lugar[]>(
        `${this.API_URL}/lugares/`
      )
      .subscribe({

        next: (datos) => {

          this.lugares.set(datos);

          this.cargando.set(false);
        },

        error: (err) => {

          console.error(
            'Error al obtener lugares:',
            err
          );

          this.error.set(
            'No se pudieron cargar los lugares.'
          );

          this.cargando.set(false);
        }

      });
  }


  // =====================================================
  // EVENTOS
  // =====================================================

  obtenerEventos(): void {

    this.http
      .get<Evento[]>(
        `${this.API_URL}/eventos/`
      )
      .subscribe({

        next: (datos) => {

          this.eventos.set(datos);
        },

        error: (err) => {

          console.error(
            'Error al obtener eventos:',
            err
          );
        }

      });
  }


  eventosDelLugar(
    lugarId: number
  ): Evento[] {

    return this.eventos().filter(

      evento =>
        evento.lugar === lugarId
        &&
        evento.activo

    );
  }


  // =====================================================
  // NAVEGACIÓN
  // =====================================================

  verLugar(
    lugar: Lugar
  ): void {

    this.lugarSeleccionado.set(lugar);

    this.actualizarMapa(lugar);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  volverInicio(): void {

    this.lugarSeleccionado.set(null);

    this.mapaUrl.set(null);

    this.vista.set('inicio');

    this.mensajeAuth.set('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  mostrarEventos(): void {

    this.lugarSeleccionado.set(null);

    this.vista.set('eventos');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  mostrarLogin(): void {

    this.lugarSeleccionado.set(null);

    this.mensajeAuth.set('');

    this.tipoAcceso.set('PERSONA');

    this.vista.set('login');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  mostrarRegistro(): void {

    this.lugarSeleccionado.set(null);

    this.mensajeAuth.set('');

    this.tipoRegistro.set('PERSONA');

    this.vista.set('registro');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  mostrarPerfil(): void {

    if (!this.usuarioActual()) {

      this.mostrarLogin();

      return;
    }

    this.lugarSeleccionado.set(null);

    this.vista.set('perfil');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  irInicioSegunRol(): void {

    if (this.esNegocio()) {

      this.mostrarNegocios();

      return;
    }


    if (this.esAdmin()) {

      this.mostrarAdmin();

      return;
    }


    this.volverInicio();
  }


  // =====================================================
  // ROLES
  // =====================================================

  esPersona(): boolean {

    return (
      this.usuarioActual()?.tipo_usuario
      === 'PERSONA'
    );
  }


  esNegocio(): boolean {

    return (
      this.usuarioActual()?.tipo_usuario
      === 'NEGOCIO'
    );
  }


  esAdmin(): boolean {

    return (
      this.usuarioActual()?.tipo_usuario
      === 'ADMIN'
    );
  }


  negocioPuedePublicar(): boolean {

    return (
      this.esNegocio()
      &&
      this.usuarioActual()
        ?.estado_negocio === 'VERIFICADO'
    );
  }


  estadoNegocioTexto(): string {

    const estado =
      this.usuarioActual()
        ?.estado_negocio;

    switch (estado) {

      case 'VERIFICADO':
        return 'Organización verificada';

      case 'PENDIENTE':
        return 'Verificación pendiente';

      case 'RECHAZADO':
        return 'Solicitud rechazada';

      case 'SUSPENDIDO':
        return 'Organización suspendida';

      default:
        return 'Sin estado';
    }
  }


  // =====================================================
  // TOKEN
  // =====================================================

  private headersAutenticados():
    HttpHeaders {

    const token = this.token();

    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Token ${token}`
    });
  }


  private guardarSesion(
    respuesta: AuthResponse
  ): void {

    localStorage.setItem(
      'planify_token',
      respuesta.token
    );

    this.token.set(
      respuesta.token
    );

    this.usuarioActual.set(
      respuesta.usuario
    );
  }


  private limpiarSesion(): void {

    localStorage.removeItem(
      'planify_token'
    );

    this.token.set(null);

    this.usuarioActual.set(null);
  }


  // =====================================================
  // RECUPERAR SESIÓN
  // =====================================================

  recuperarSesion(): void {

    const token = this.token();

    if (!token) {
      return;
    }

    this.http
      .get<UsuarioSesion>(
        `${this.API_URL}/auth/me/`,
        {
          headers:
            this.headersAutenticados()
        }
      )
      .subscribe({

        next: (usuario) => {

          if (this.esRutaFundador()) {

            if (
              usuario.tipo_usuario
              === 'ADMIN'
            ) {

              this.usuarioActual.set(
                usuario
              );

              this.vista.set('admin');

            } else {

              this.limpiarSesion();

              this.vista.set(
                'fundador'
              );

              this.mensajeAuth.set(
                'Acceso reservado al fundador de Planify.'
              );
            }

            return;
          }


          this.usuarioActual.set(
            usuario
          );
        },

        error: (err) => {

          console.error(
            'Sesión no válida:',
            err
          );

          this.limpiarSesion();
        }

      });
  }


  // =====================================================
  // LOGIN
  // =====================================================

  iniciarSesion(
    email: string,
    password: string
  ): void {

    email = email.trim();

    if (!email || !password) {

      this.mensajeAuth.set(
        'Completa correo y contraseña.'
      );

      return;
    }


    this.cargandoAuth.set(true);

    this.mensajeAuth.set('');


    this.http
      .post<AuthResponse>(
        `${this.API_URL}/auth/login/`,
        {
          email,
          password
        }
      )
      .subscribe({

        next: (respuesta) => {

          const tipoReal =
            respuesta.usuario
              .tipo_usuario;


          if (
            tipoReal !== this.tipoAcceso()
          ) {

            this.cargandoAuth.set(false);


            if (tipoReal === 'PERSONA') {

              this.mensajeAuth.set(
                'Esta cuenta corresponde a un usuario. '
                +
                'Selecciona "Usuario" para ingresar.'
              );


            } else if (
              tipoReal === 'NEGOCIO'
            ) {

              this.mensajeAuth.set(
                'Esta cuenta corresponde a una organización. '
                +
                'Selecciona "Organización" para ingresar.'
              );


            } else {

              this.mensajeAuth.set(
                'Esta cuenta no corresponde a un acceso público.'
              );
            }


            return;
          }


          this.guardarSesion(
            respuesta
          );

          this.cargandoAuth.set(false);

          this.mensajeAuth.set('');


          if (
            respuesta.usuario
              .tipo_usuario === 'ADMIN'
          ) {

            this.vista.set('admin');

          } else if (
            respuesta.usuario
              .tipo_usuario === 'NEGOCIO'
          ) {

            this.vista.set(
              'negocios'
            );

          } else {

            this.vista.set(
              'inicio'
            );
          }

          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        },


        error: (err) => {

          console.error(
            'Error al iniciar sesión:',
            err
          );

          this.cargandoAuth.set(false);

          this.mensajeAuth.set(
            err?.error?.error
            ||
            'No se pudo iniciar sesión.'
          );
        }

      });
  }


  // =====================================================
  // REGISTRO
  // =====================================================

  registrarUsuario(
    nombre: string,
    email: string,
    password: string,
    confirmarPassword: string,
    tipoUsuario: string,
    rangoEdad: string,
    comuna: string,
    intereses: string,
    nombreNegocio: string,
    rutNegocio: string
  ): void {

    nombre = nombre.trim();

    email = email.trim();


    if (
      !nombre
      ||
      !email
      ||
      !password
      ||
      !tipoUsuario
    ) {

      this.mensajeAuth.set(
        'Completa los campos obligatorios.'
      );

      return;
    }


    if (
      password
      !== confirmarPassword
    ) {

      this.mensajeAuth.set(
        'Las contraseñas no coinciden.'
      );

      return;
    }


    if (
      tipoUsuario === 'NEGOCIO'
      &&
      !nombreNegocio.trim()
    ) {

      this.mensajeAuth.set(
        'Ingresa el nombre de la organización.'
      );

      return;
    }


    if (
      tipoUsuario === 'NEGOCIO'
      &&
      !rutNegocio.trim()
    ) {

      this.mensajeAuth.set(
        'Ingresa el RUT de la organización.'
      );

      return;
    }


    const datos = {

      nombre,

      email,

      password,

      tipo_usuario:
        tipoUsuario,

      rango_edad:
        rangoEdad,

      comuna,

      intereses,

      nombre_negocio:
        nombreNegocio.trim(),

      rut_negocio:
        rutNegocio.trim()
    };


    this.cargandoAuth.set(true);

    this.mensajeAuth.set('');


    this.http
      .post<AuthResponse>(
        `${this.API_URL}/auth/register/`,
        datos
      )
      .subscribe({

        next: (respuesta) => {

          this.guardarSesion(
            respuesta
          );

          this.cargandoAuth.set(false);


          if (
            respuesta.usuario
              .tipo_usuario
            === 'NEGOCIO'
          ) {

            this.mensajeNegocio.set(
              'Tu organización fue registrada. '
              +
              'La verificación está pendiente.'
            );

            this.vista.set(
              'negocios'
            );

          } else {

            this.vista.set(
              'perfil'
            );
          }


          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        },


        error: (err) => {

          console.error(
            'Error al registrar:',
            err
          );

          this.cargandoAuth.set(false);


          if (
            err?.error?.email
          ) {

            this.mensajeAuth.set(
              err.error.email[0]
            );

          } else if (
            err?.error
              ?.nombre_negocio
          ) {

            this.mensajeAuth.set(
              err.error
                .nombre_negocio[0]
            );

          } else if (
            err?.error
              ?.rut_negocio
          ) {

            this.mensajeAuth.set(
              err.error
                .rut_negocio[0]
            );

          } else if (
            err?.error
              ?.non_field_errors
          ) {

            this.mensajeAuth.set(
              err.error
                .non_field_errors[0]
            );

          } else {

            this.mensajeAuth.set(
              'No se pudo crear la cuenta.'
            );
          }
        }

      });
  }


  iniciarSesionFundador(
    identificador: string,
    password: string
  ): void {

    identificador =
      identificador.trim();


    if (
      !identificador
      ||
      !password
    ) {

      this.mensajeAuth.set(
        'Completa usuario y contraseña.'
      );

      return;
    }


    this.cargandoAuth.set(true);

    this.mensajeAuth.set('');


    this.http
      .post<AuthResponse>(
        `${this.API_URL}/auth/login/`,
        {
          email:
            identificador,

          password
        }
      )
      .subscribe({

        next: (respuesta) => {

          if (
            respuesta.usuario
              .tipo_usuario
            !== 'ADMIN'
          ) {

            this.cargandoAuth.set(
              false
            );

            this.mensajeAuth.set(
              'Acceso denegado. Esta sección está reservada al fundador de Planify.'
            );

            return;
          }


          this.guardarSesion(
            respuesta
          );

          this.cargandoAuth.set(false);

          this.mensajeAuth.set('');

          this.vista.set('admin');

          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        },


        error: (err) => {

          console.error(
            'Error de acceso fundador:',
            err
          );

          this.cargandoAuth.set(false);

          this.mensajeAuth.set(
            err?.error?.error
            ||
            'Usuario o contraseña incorrectos.'
          );
        }

      });
  }


  // =====================================================
  // LOGOUT
  // =====================================================

  cerrarSesion(): void {

    const eraFundador =
      this.esAdmin()
      ||
      this.esRutaFundador();


    if (!this.token()) {

      this.limpiarSesion();

      if (eraFundador) {

        window.history.replaceState(
          {},
          '',
          '/fundador'
        );

        this.vista.set(
          'fundador'
        );

        this.mensajeAuth.set('');

      } else {

        this.volverInicio();
      }

      return;
    }


    this.http
      .post(
        `${this.API_URL}/auth/logout/`,
        {},
        {
          headers:
            this.headersAutenticados()
        }
      )
      .subscribe({

        next: () => {

          this.limpiarSesion();


          if (eraFundador) {

            window.history.replaceState(
              {},
              '',
              '/fundador'
            );

            this.vista.set(
              'fundador'
            );

            this.mensajeAuth.set('');

          } else {

            this.volverInicio();
          }
        },

        error: () => {

          // Aunque falle el servidor,
          // cerramos la sesión local.
          this.limpiarSesion();


          if (eraFundador) {

            window.history.replaceState(
              {},
              '',
              '/fundador'
            );

            this.vista.set(
              'fundador'
            );

            this.mensajeAuth.set('');

          } else {

            this.volverInicio();
          }
        }

      });
  }


  // =====================================================
  // NEGOCIOS
  // =====================================================

  mostrarNegocios(): void {

    if (!this.esNegocio()) {

      this.mensajeAuth.set(
        'Debes iniciar sesión '
        +
        'con una cuenta de organización.'
      );

      this.mostrarLogin();

      return;
    }


    this.lugarSeleccionado.set(null);

    this.vista.set('negocios');

    this.mensajeNegocio.set('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  eventosDeMiOrganizacion(): Evento[] {

    const usuario = this.usuarioActual();

    if (
      !usuario
      ||
      usuario.tipo_usuario !== 'NEGOCIO'
    ) {
      return [];
    }

    return this.eventos().filter(
      evento =>
        evento.organizacion === usuario.id
    );
  }


  crearEvento(
    titulo: string,
    descripcion: string,
    fecha: string,
    hora: string,
    lugar: string
  ): void {

    if (!this.esNegocio()) {

      this.mensajeNegocio.set(
        'Debes iniciar sesión '
        +
        'como organización.'
      );

      return;
    }


    if (!this.negocioPuedePublicar()) {

      this.mensajeNegocio.set(
        'Tu organización todavía '
        +
        'no está verificada.'
      );

      return;
    }


    if (
      !titulo
      ||
      !descripcion
      ||
      !fecha
      ||
      !hora
      ||
      !lugar
    ) {

      this.mensajeNegocio.set(
        'Completa todos los campos '
        +
        'antes de publicar.'
      );

      return;
    }


    const nuevoEvento = {

      titulo,

      descripcion,

      fecha,

      hora,

      lugar:
        Number(lugar),

      activo: true
    };


    this.http
      .post<Evento>(
        `${this.API_URL}/eventos/`,
        nuevoEvento,
        {
          headers:
            this.headersAutenticados()
        }
      )
      .subscribe({

        next: () => {

          this.mensajeNegocio.set(
            '✅ Evento publicado correctamente.'
          );

          this.obtenerEventos();
        },

        error: (err) => {

          console.error(
            'Error al crear evento:',
            err
          );

          this.mensajeNegocio.set(
            err?.error?.detail
            ||
            '❌ No se pudo publicar el evento.'
          );
        }

      });
  }


  iniciarEdicionEvento(
    evento: Evento
  ): void {

    const usuario =
      this.usuarioActual();


    if (
      !usuario
      ||
      usuario.tipo_usuario !== 'NEGOCIO'
      ||
      evento.organizacion !== usuario.id
    ) {

      this.mensajeNegocio.set(
        'Solo puedes editar eventos de tu organización.'
      );

      return;
    }


    this.eventoEditando.set(
      evento
    );

    this.mensajeNegocio.set('');

    setTimeout(() => {

      document
        .getElementById(
          'editar-evento'
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    }, 0);
  }


  cancelarEdicionEvento(): void {

    this.eventoEditando.set(null);

    this.mensajeNegocio.set('');
  }


  guardarEdicionEvento(
    titulo: string,
    descripcion: string,
    fecha: string,
    hora: string,
    lugar: string
  ): void {

    const evento =
      this.eventoEditando();


    if (!evento) {
      return;
    }


    if (!this.negocioPuedePublicar()) {

      this.mensajeNegocio.set(
        'La organización debe estar verificada.'
      );

      return;
    }


    if (
      !titulo.trim()
      ||
      !descripcion.trim()
      ||
      !fecha
      ||
      !hora
      ||
      !lugar
    ) {

      this.mensajeNegocio.set(
        'Completa todos los campos antes de guardar.'
      );

      return;
    }


    const datos = {

      titulo:
        titulo.trim(),

      descripcion:
        descripcion.trim(),

      fecha,

      hora,

      lugar:
        Number(lugar),

      activo:
        evento.activo
    };


    this.http
      .put<Evento>(
        `${this.API_URL}/eventos/${evento.id}/`,
        datos,
        {
          headers:
            this.headersAutenticados()
        }
      )
      .subscribe({

        next: () => {

          this.eventoEditando.set(null);

          this.mensajeNegocio.set(
            '✅ Evento actualizado correctamente.'
          );

          this.obtenerEventos();
        },

        error: (err) => {

          console.error(
            'Error al editar evento:',
            err
          );

          this.mensajeNegocio.set(
            err?.error?.detail
            ||
            '❌ No se pudo actualizar el evento.'
          );
        }

      });
  }


  eliminarEvento(
    evento: Evento
  ): void {

    const usuario =
      this.usuarioActual();


    if (
      !usuario
      ||
      usuario.tipo_usuario !== 'NEGOCIO'
      ||
      evento.organizacion !== usuario.id
    ) {

      this.mensajeNegocio.set(
        'Solo puedes eliminar eventos de tu organización.'
      );

      return;
    }


    const confirmar =
      window.confirm(
        `¿Eliminar el evento "${evento.titulo}"?`
      );


    if (!confirmar) {
      return;
    }


    this.http
      .delete(
        `${this.API_URL}/eventos/${evento.id}/`,
        {
          headers:
            this.headersAutenticados()
        }
      )
      .subscribe({

        next: () => {

          if (
            this.eventoEditando()?.id
            === evento.id
          ) {

            this.eventoEditando.set(
              null
            );
          }


          this.mensajeNegocio.set(
            '✅ Evento eliminado correctamente.'
          );

          this.obtenerEventos();
        },

        error: (err) => {

          console.error(
            'Error al eliminar evento:',
            err
          );

          this.mensajeNegocio.set(
            err?.error?.detail
            ||
            '❌ No se pudo eliminar el evento.'
          );
        }

      });
  }


  urlDjangoAdmin(): string {

    return (
      this.API_URL
        .replace(
          /\/api\/?$/,
          ''
        )
      +
      '/admin/'
    );
  }


  // =====================================================
  // ADMIN
  // =====================================================

  mostrarAdmin(): void {

    if (!this.esAdmin()) {

      this.mensajeAuth.set(
        'Esta sección requiere '
        +
        'una cuenta de administrador.'
      );

      this.mostrarLogin();

      return;
    }


    this.lugarSeleccionado.set(null);

    this.vista.set('admin');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

}