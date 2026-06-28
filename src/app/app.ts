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

  todosLosVotos = signal<any[]>([]);
  usuarioEspiado = signal<any>(null);
  historialEspia = signal<any[]>([]);
  grupoEspiaSeleccionado = signal<string>('TODOS');

  historialEspiaFiltrado = computed(() => {
    const seleccion = this.grupoEspiaSeleccionado();
    if (seleccion === 'TODOS') return this.historialEspia();
    return this.historialEspia().filter((p) => p.grupo === seleccion);
  });

  gruposEspiaDisponibles = computed(() => {
    const grupos = this.historialEspia().map((p) => p.grupo);
    const fasesUnicas = [...new Set(grupos)];

    const ordenDeseado = [
      'GRUPO A',
      'GRUPO B',
      'GRUPO C',
      'GRUPO D',
      'GRUPO E',
      'GRUPO F',
      'GRUPO G',
      'GRUPO H',
      'GRUPO I',
      'GRUPO J',
      'GRUPO K',
      'GRUPO L',
      'FASE 16',
      'OCTAVOS',
      'CUARTOS',
      'SEMIFINALES',
      'TERCER LUGAR',
      'FINAL',
    ];

    fasesUnicas.sort((a, b) => {
      const posA = ordenDeseado.indexOf(a.toUpperCase());
      const posB = ordenDeseado.indexOf(b.toUpperCase());
      const pesoA = posA === -1 ? 99 : posA;
      const pesoB = posB === -1 ? 99 : posB;
      return pesoA - pesoB;
    });

    return ['TODOS', ...fasesUnicas];
  });

  gruposMundial = computed(() => {
    const entradas = Object.entries(DICCIONARIO_EQUIPOS);
    const grupos = [];
    let letraASCII = 65;

    const partidosJugados = this.partidos().filter((p) => p.estado === 'FINALIZADO');

    for (let i = 0; i < entradas.length; i += 4) {
      const nombreGrupo = 'GRUPO ' + String.fromCharCode(letraASCII);

      const equiposDelGrupo = entradas.slice(i, i + 4).map(([id, nombre]) => ({
        id,
        nombre,
        bandera: `https://flagcdn.com/w40/${id}.png`,
        pj: 0,
        g: 0,
        e: 0,
        p: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
      }));

      const partidosDeEsteGrupo = partidosJugados.filter(
        (p) => p.grupo.toUpperCase() === nombreGrupo,
      );

      partidosDeEsteGrupo.forEach((partido) => {
        const eqLocal = equiposDelGrupo.find((e) => e.nombre === partido.equipoLocal.nombre);
        const eqVisita = equiposDelGrupo.find((e) => e.nombre === partido.equipoVisitante.nombre);

        if (eqLocal && eqVisita) {
          eqLocal.pj++;
          eqVisita.pj++;
          eqLocal.gf += partido.golesLocal!;
          eqLocal.gc += partido.golesVisitante!;
          eqVisita.gf += partido.golesVisitante!;
          eqVisita.gc += partido.golesLocal!;

          if (partido.golesLocal! > partido.golesVisitante!) {
            eqLocal.g++;
            eqLocal.pts += 3;
            eqVisita.p++;
          } else if (partido.golesLocal! < partido.golesVisitante!) {
            eqVisita.g++;
            eqVisita.pts += 3;
            eqLocal.p++;
          } else {
            eqLocal.e++;
            eqVisita.e++;
            eqLocal.pts += 1;
            eqVisita.pts += 1;
          }
        }
      });

      equiposDelGrupo.forEach((eq) => (eq.dg = eq.gf - eq.gc));
      equiposDelGrupo.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

      grupos.push({
        nombre: nombreGrupo,
        equipos: equiposDelGrupo,
      });
      letraASCII++;
    }
    return grupos;
  });

  grupoSeleccionado = signal<string>('TODOS');

  gruposDisponibles = computed(() => {
    const grupos = this.partidos().map((p) => p.grupo);
    const fasesUnicas = [...new Set(grupos)];

    const ordenDeseado = [
      'GRUPO A',
      'GRUPO B',
      'GRUPO C',
      'GRUPO D',
      'GRUPO E',
      'GRUPO F',
      'GRUPO G',
      'GRUPO H',
      'GRUPO I',
      'GRUPO J',
      'GRUPO K',
      'GRUPO L',
      'FASE 16',
      'OCTAVOS',
      'CUARTOS',
      'SEMIFINALES',
      'TERCER LUGAR',
      'FINAL',
    ];

    fasesUnicas.sort((a, b) => {
      const posA = ordenDeseado.indexOf(a.toUpperCase());
      const posB = ordenDeseado.indexOf(b.toUpperCase());

      const pesoA = posA === -1 ? 99 : posA;
      const pesoB = posB === -1 ? 99 : posB;

      return pesoA - pesoB;
    });

    return ['TODOS', ...fasesUnicas];
  });

  diaSeleccionado = signal<string>('Hoy');

  diasDisponibles = computed(() => {
    let partidosDelGrupo = this.partidos();
    if (this.grupoSeleccionado() !== 'TODOS') {
      partidosDelGrupo = partidosDelGrupo.filter((p) => p.grupo === this.grupoSeleccionado());
    }
    const dias = partidosDelGrupo.map((p) => p.diaFiltro);
    return ['TODOS', ...new Set(dias)];
  });

  partidosFiltrados = computed(() => {
    const seleccionDia = this.diaSeleccionado();
    const seleccionGrupo = this.grupoSeleccionado();

    let filtrados = this.partidos();

    if (seleccionGrupo !== 'TODOS') {
      filtrados = filtrados.filter((p) => p.grupo === seleccionGrupo);
    }

    if (seleccionDia !== 'TODOS') {
      filtrados = filtrados.filter((p) => p.diaFiltro === seleccionDia);
    }

    return filtrados;
  });

  torneoFinalizado = computed(() => {
    return this.partidos().some(
      (p) => p.fase.toUpperCase() === 'FINAL' && p.estado === 'FINALIZADO',
    );
  });

  seleccionarGrupo(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.grupoSeleccionado.set(select.value);
    this.diaSeleccionado.set('TODOS');
  }

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
        this.todosLosVotos.set(respuestas.votos);

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

          let resultadoApuesta = 'PENDIENTE';
          let puntosGanados = 0;

          if (p.estado === 'FINALIZADO') {
            if (!votoEncontrado) {
              resultadoApuesta = 'SIN_VOTO';
            } else {
              let resultadoReal = 'EMPATE';
              if (p.golesLocal > p.golesVisitante) resultadoReal = 'LOCAL';
              if (p.golesLocal < p.golesVisitante) resultadoReal = 'VISITANTE';

              if (votoEncontrado.pronostico === resultadoReal) {
                resultadoApuesta = 'ACERTO';
                const fase = p.fase.toUpperCase();
                if (fase.includes('FASE 16') || fase.includes('ELIMINATORIA')) puntosGanados = 2;
                else if (fase.includes('OCTAVOS')) puntosGanados = 3;
                else if (fase.includes('CUARTOS')) puntosGanados = 4;
                else if (fase.includes('SEMIFINAL')) puntosGanados = 5;
                else if (fase.includes('TERCER')) puntosGanados = 3;
                else if (fase.includes('FINAL')) puntosGanados = 6;
                else puntosGanados = 1;
              } else {
                resultadoApuesta = 'FALLO';
              }
            }
          }

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
            resultadoApuesta: resultadoApuesta,
            puntosGanados: puntosGanados,
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
            this.mensajeSalseo.set(`Ya casi alcanzas a: ${primero.nombre}`);
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

  espiarUsuario(usuario: any) {
    if (usuario.id === this.usuarioActualId()) return;

    this.usuarioEspiado.set(usuario);
    this.grupoEspiaSeleccionado.set('TODOS');

    const idObjetivo = String(usuario.id || usuario.usuarioId);
    const susVotos = this.todosLosVotos().filter((v) => String(v.usuarioId) === idObjetivo);

    const partidosFinalizados = this.partidos().filter((p) => p.estado === 'FINALIZADO');

    const historial = partidosFinalizados
      .map((p) => {
        const voto = susVotos.find((v) => String(v.partidoId) === String(p.id));

        let resultado = 'SIN_VOTO';
        let puntos = 0;
        let nombreVoto = 'Ninguno';

        if (voto) {
          if (voto.pronostico === 'LOCAL') nombreVoto = p.equipoLocal.nombre;
          else if (voto.pronostico === 'VISITANTE') nombreVoto = p.equipoVisitante.nombre;
          else nombreVoto = 'Empate';

          let resultadoReal = 'EMPATE';
          if (p.golesLocal! > p.golesVisitante!) resultadoReal = 'LOCAL';
          if (p.golesLocal! < p.golesVisitante!) resultadoReal = 'VISITANTE';

          if (voto.pronostico === resultadoReal) {
            resultado = 'ACERTO';
            const fase = p.fase.toUpperCase();
            if (fase.includes('FASE 16') || fase.includes('ELIMINATORIA')) puntos = 2;
            else if (fase.includes('OCTAVOS')) puntos = 3;
            else if (fase.includes('CUARTOS')) puntos = 4;
            else if (fase.includes('SEMIFINAL')) puntos = 5;
            else if (fase.includes('TERCER')) puntos = 3;
            else if (fase.includes('FINAL')) puntos = 6;
            else puntos = 1;
          } else {
            resultado = 'FALLO';
          }
        }

        return {
          ...p,
          resultadoApuestaEspia: resultado,
          puntosGanadosEspia: puntos,
          suVotoNombre: nombreVoto,
        };
      })
      .reverse();

    this.historialEspia.set(historial);
  }
}
