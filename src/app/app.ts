import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatchCard } from './components/match-card/match-card';
import { forkJoin, interval } from 'rxjs';
import { Login } from './components/login/login';
import { environment } from '../environments/environment';
import { AdminPanel } from './components/admin/admin';
import { FormsModule } from '@angular/forms';
import { LoaderService } from './loader.service';

const DICCIONARIO_EQUIPOS: Record<string, string> = {
  // Grupo A
  mx: 'México',
  za: 'Sudáfrica',
  kr: 'Corea del Sur',
  cz: 'Chequia',

  // Grupo B
  ca: 'Canadá',
  ba: 'Bosnia y Herzegovina',
  qa: 'Catar',
  ch: 'Suiza',

  // Grupo C
  br: 'Brasil',
  ma: 'Marruecos',
  ht: 'Haití',
  'gb-sct': 'Escocia',

  // Grupo D
  us: 'Estados Unidos',
  py: 'Paraguay',
  au: 'Australia',
  tr: 'Turquía',

  // Grupo E
  de: 'Alemania',
  cw: 'Curazao',
  ci: 'Costa de Marfil',
  ec: 'Ecuador',

  // Grupo F
  nl: 'Países Bajos',
  jp: 'Japón',
  se: 'Suecia',
  tn: 'Túnez',

  // Grupo G
  be: 'Bélgica',
  eg: 'Egipto',
  ir: 'Irán',
  nz: 'Nueva Zelanda',

  // Grupo H
  es: 'España',
  cv: 'Cabo Verde',
  sa: 'Arabia Saudita',
  uy: 'Uruguay',

  // Grupo I
  fr: 'Francia',
  sn: 'Senegal',
  iq: 'Irak',
  no: 'Noruega',

  // Grupo J
  ar: 'Argentina',
  dz: 'Argelia',
  at: 'Austria',
  jo: 'Jordania',

  // Grupo K
  pt: 'Portugal',
  cd: 'República Democrática del Congo',
  uz: 'Uzbekistán',
  co: 'Colombia',

  // Grupo L
  'gb-eng': 'Inglaterra',
  hr: 'Croacia',
  gh: 'Ghana',
  pa: 'Panamá',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatchCard, Login, AdminPanel, FormsModule, NgOptimizedImage],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  private http = inject(HttpClient);
  loader = inject(LoaderService);

  miPerfil = signal<any>(null);
  usuarioActualId = signal<number | null>(null);
  partidos = signal<any[]>([]);

  toastMensaje = signal<string>('');
  mostrarToast = signal<boolean>(false);
  esErrorToast = signal<boolean>(false);

  vistaActual = signal<'Pronósticos' | 'Ranking' | 'admin' | 'Grupos'>('Pronósticos');
  listaRanking = signal<any[]>([]);

  grupoSeleccionado = signal<string>('TODOS');

  gruposDisponibles = computed(() => {
    const grupos = this.partidos().map((p) => p.grupo);
    return ['TODOS', ...new Set(grupos)];
  });

  gruposMundial = computed(() => {
    const entradas = Object.entries(DICCIONARIO_EQUIPOS);
    const grupos = [];
    let letraASCII = 65;

    for (let i = 0; i < entradas.length; i += 4) {
      const equiposDelGrupo = entradas.slice(i, i + 4).map(([id, nombre]) => ({
        id,
        nombre,
        bandera: `https://flagcdn.com/w40/${id}.png`,
      }));

      grupos.push({
        nombre: 'GRUPO ' + String.fromCharCode(letraASCII),
        equipos: equiposDelGrupo,
      });
      letraASCII++;
    }
    return grupos;
  });

  diaSeleccionado = signal<string>('Hoy');

  diasDisponibles = computed(() => {
    const dias = this.partidos().map((p) => p.diaFiltro);
    return ['TODOS', ...new Set(dias)];
  });

  partidosFiltrados = computed(() => {
    const seleccion = this.diaSeleccionado();
    if (seleccion === 'TODOS') return this.partidos();
    return this.partidos().filter((p) => p.diaFiltro === seleccion);
  });

  mostrarModalPin = signal<boolean>(false);
  pinActual = signal<string>('');
  pinNuevo = signal<string>('');

  limpiarPinActual(event: any) {
    const input = event.target;
    const limpio = input.value.replace(/\D/g, '');
    if (input.value !== limpio) input.value = limpio;
    this.pinActual.set(limpio);
  }

  limpiarPinNuevo(event: any) {
    const input = event.target;
    const limpio = input.value.replace(/\D/g, '');
    if (input.value !== limpio) input.value = limpio;
    this.pinNuevo.set(limpio);
  }

  mensajeSalseo = signal<string>('Que empiecen los pronósticos');

  seleccionarDia(dia: string, event: MouseEvent) {
    this.diaSeleccionado.set(dia);
    const boton = event.target as HTMLElement;
    boton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  ngOnInit() {
    const idGuardado = localStorage.getItem('usuarioApuestaId');
    if (idGuardado) {
      this.iniciarSesion(Number(idGuardado));

      interval(30000).subscribe(() => {
        if (this.usuarioActualId()) {
          this.cargarDatos(this.usuarioActualId()!, true);
        }
      });
    }
  }

  cargarPronosticos() {
    if (this.usuarioActualId()) {
      this.cargarDatos(this.usuarioActualId()!);
    }
    this.vistaActual.set('Pronósticos');
  }

  iniciarSesion(id: number) {
    this.usuarioActualId.set(id);
    this.cargarDatos(id);
    this.cargarRanking();
    this.http.get<any[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: (usuarios) => {
        const yo = usuarios.find((u: any) => u.id === id);
        if (yo) this.miPerfil.set(yo);
      },
    });
  }

  cargarDatos(usuarioId: number, enSegundoPlano = false) {
    const hoy = new Date();
    const strHoy = hoy.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });

    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const strAyer = ayer.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });

    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const strManana = manana.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });

    let opciones = {};
    if (enSegundoPlano) {
      opciones = { headers: new HttpHeaders({ 'X-Silencioso': 'true' }) };
    }

    forkJoin({
      partidos: this.http.get<any[]>(`${environment.apiUrl}/partidos`, opciones),
      votos: this.http.get<any[]>(`${environment.apiUrl}/votos`, opciones),
    }).subscribe({
      next: (respuestas) => {
        const misVotos = respuestas.votos.filter((v: any) => v.usuarioId === usuarioId);

        respuestas.partidos.sort((a: any, b: any) => {
          return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
        });

        const partidosMapeados = respuestas.partidos.map((p: any) => {
          const votoEncontrado = misVotos.find((v: any) => v.partidoId === p.id);
          const fechaObj = new Date(p.fechaHora);

          const fechaCorta = fechaObj.toLocaleDateString('es-BO', {
            day: '2-digit',
            month: 'short',
          });
          let etiquetaFiltro = fechaCorta;

          if (fechaCorta === strHoy) etiquetaFiltro = 'Hoy';
          else if (fechaCorta === strAyer) etiquetaFiltro = 'Ayer';
          else if (fechaCorta === strManana) etiquetaFiltro = 'Mañana';

          return {
            id: p.id,
            fase: p.fase,
            grupo: p.fase,
            diaFiltro: etiquetaFiltro,

            equipoLocal: {
              nombre: DICCIONARIO_EQUIPOS[p.equipoLocal] || p.equipoLocal.toUpperCase(),
              bandera: `https://flagcdn.com/w80/${p.equipoLocal}.png`,
            },
            equipoVisitante: {
              nombre: DICCIONARIO_EQUIPOS[p.equipoVisitante] || p.equipoVisitante.toUpperCase(),
              bandera: `https://flagcdn.com/w80/${p.equipoVisitante}.png`,
            },

            fecha: (function () {
              const str = fechaObj.toLocaleString('es-BO', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              return str.charAt(0).toUpperCase() + str.slice(1) + ' Hrs';
            })(),

            votoPrevio: votoEncontrado ? votoEncontrado.pronostico : null,
            estado: p.estado,
            golesLocal: p.golesLocal,
            golesVisitante: p.golesVisitante,
          };
        });

        this.partidos.set(partidosMapeados);

        setTimeout(() => {
          const botonActivo = document.querySelector('.btn-filtro.activo');
          if (botonActivo) {
            botonActivo.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        }, 100);
      },
      error: (err) => console.error('Error al cargar datos desde el backend..', err),
    });
  }

  registrarVoto(pronostico: string, partidoId: number) {
    const payload = {
      usuarioId: this.usuarioActualId(),
      partidoId: partidoId,
      pronostico: pronostico,
    };

    this.http.post(`${environment.apiUrl}/votos`, payload).subscribe({
      next: () => {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        this.toastMensaje.set(`El pronóstico se guardó correctamente..`);
        this.esErrorToast.set(false);
        this.mostrarToast.set(true);

        const partidosActualizados = this.partidos().map((p) => {
          if (p.id === partidoId) {
            return { ...p, votoPrevio: pronostico };
          }
          return p;
        });

        this.partidos.set(partidosActualizados);

        setTimeout(() => {
          this.mostrarToast.set(false);
        }, 3000);
      },
      error: (err) => console.error('Error al enviar el voto..', err),
    });
  }

  cargarRanking() {
    this.http.get<any[]>(`${environment.apiUrl}/ranking`).subscribe({
      next: (data) => {
        const rankingSinAdmin = data.filter(
          (u: any) => u.id !== 1 && u.nombre !== 'Admin' && u.nombre !== 'Administrador',
        );
        this.listaRanking.set(rankingSinAdmin);

        if (rankingSinAdmin.length > 0) {
          const primero = rankingSinAdmin[0];
          const miUser = rankingSinAdmin.find((u) => u.id === this.usuarioActualId());

          if (primero.id === this.usuarioActualId()) {
            this.mensajeSalseo.set(`Vas ganando, ${primero.nombre}..`);
          } else if (miUser && rankingSinAdmin.indexOf(miUser) === 1) {
            this.mensajeSalseo.set(`Ya casi logras superar a ${primero.nombre}..`);
          } else {
            this.mensajeSalseo.set(`${primero.nombre}, lidera con ${primero.puntos} puntos`);
          }
        }
      },
      error: (err) => console.error('Error al cargar ranking', err),
    });
  }

  cerrarSesion() {
    localStorage.removeItem('usuarioApuestaId');
    localStorage.removeItem('jwt_token');

    this.usuarioActualId.set(null);
    this.partidos.set([]);
    this.listaRanking.set([]);
    this.miPerfil.set(null);
    this.vistaActual.set('Pronósticos');
  }

  abrirModalPin() {
    this.pinActual.set('');
    this.pinNuevo.set('');
    this.mostrarModalPin.set(true);
  }

  guardarNuevoPin() {
    const pinRegex = /^\d{4}$/;

    if (!pinRegex.test(String(this.pinActual())) || !pinRegex.test(String(this.pinNuevo()))) {
      this.toastMensaje.set('Ambos PINs deben ser exactamente de 4 números..');
      this.esErrorToast.set(true);
      this.mostrarToast.set(true);
      setTimeout(() => this.mostrarToast.set(false), 3000);
      return;
    }

    const payload = {
      pinActual: String(this.pinActual()),
      pinNuevo: String(this.pinNuevo()),
    };

    this.http
      .patch(`${environment.apiUrl}/usuarios/${this.usuarioActualId()}/pin`, payload)
      .subscribe({
        next: () => {
          this.toastMensaje.set('Tu PIN fue actualizado..');
          this.esErrorToast.set(false);
          this.mostrarToast.set(true);
          this.mostrarModalPin.set(false);
          setTimeout(() => this.mostrarToast.set(false), 3000);
        },
        error: (err) => {
          this.toastMensaje.set('El PIN actual que ingresaste es incorrecto..');
          this.esErrorToast.set(true);
          this.mostrarToast.set(true);
          setTimeout(() => this.mostrarToast.set(false), 3000);
        },
      });
  }
}
