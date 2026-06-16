import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necesario para los inputs
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class AdminPanel implements OnInit {
  private http = inject(HttpClient);

  nombre = signal('');
  pin = signal('');
  avatar = signal('👤');
  avataresDisponibles = ['🐦‍⬛', '🐻', '🎀', '🐈‍⬛', '🐁', '🐦‍'];

  formularioValido = computed(() => {
    const nombreLleno = this.nombre().trim().length > 0;
    const pinCorrecto = String(this.pin()).trim().length === 4;

    return nombreLleno && pinCorrecto;
  });

  partidoSeleccionadoId = signal<number | null>(null);
  golesLocal = signal<number | null>(null);
  golesVisitante = signal<number | null>(null);

  formularioPartidoValido = computed(() => {
    return (
      this.partidoSeleccionadoId() !== null &&
      this.golesLocal() !== null &&
      this.golesVisitante() !== null
    );
  });

  partidosPendientes = signal<any[]>([]);

  grupoAdminSeleccionado = signal<string>('TODOS');

  gruposAdminDisponibles = computed(() => {
    const grupos = this.partidosPendientes().map((p) => p.fase);
    return ['TODOS', ...new Set(grupos)];
  });

  partidosPendientesFiltrados = computed(() => {
    const seleccion = this.grupoAdminSeleccionado();
    if (seleccion === 'TODOS') return this.partidosPendientes();
    return this.partidosPendientes().filter((p) => p.fase === seleccion);
  });

  equiposDisponibles = [
    // Grupo A
    { id: 'mx', nombre: 'México' },
    { id: 'za', nombre: 'Sudáfrica' },
    { id: 'kr', nombre: 'Corea del Sur' },
    { id: 'cz', nombre: 'Chequia' },

    // Grupo B
    { id: 'ca', nombre: 'Canadá' },
    { id: 'ba', nombre: 'Bosnia y Herzegovina' },
    { id: 'qa', nombre: 'Catar' },
    { id: 'ch', nombre: 'Suiza' },

    // Grupo C
    { id: 'br', nombre: 'Brasil' },
    { id: 'ma', nombre: 'Marruecos' },
    { id: 'ht', nombre: 'Haití' },
    { id: 'gb-sct', nombre: 'Escocia' },

    // Grupo D
    { id: 'us', nombre: 'Estados Unidos' },
    { id: 'py', nombre: 'Paraguay' },
    { id: 'au', nombre: 'Australia' },
    { id: 'tr', nombre: 'Turquía' },

    // Grupo E
    { id: 'de', nombre: 'Alemania' },
    { id: 'cw', nombre: 'Curazao' },
    { id: 'ci', nombre: 'Costa de Marfil' },
    { id: 'ec', nombre: 'Ecuador' },

    // Grupo F
    { id: 'nl', nombre: 'Países Bajos' },
    { id: 'jp', nombre: 'Japón' },
    { id: 'se', nombre: 'Suecia' },
    { id: 'tn', nombre: 'Túnez' },

    // Grupo G
    { id: 'be', nombre: 'Bélgica' },
    { id: 'eg', nombre: 'Egipto' },
    { id: 'ir', nombre: 'Irán' },
    { id: 'nz', nombre: 'Nueva Zelanda' },

    // Grupo H
    { id: 'es', nombre: 'España' },
    { id: 'cv', nombre: 'Cabo Verde' },
    { id: 'sa', nombre: 'Arabia Saudita' },
    { id: 'uy', nombre: 'Uruguay' },

    // Grupo I
    { id: 'fr', nombre: 'Francia' },
    { id: 'sn', nombre: 'Senegal' },
    { id: 'iq', nombre: 'Irak' },
    { id: 'no', nombre: 'Noruega' },

    // Grupo J
    { id: 'ar', nombre: 'Argentina' },
    { id: 'dz', nombre: 'Argelia' },
    { id: 'at', nombre: 'Austria' },
    { id: 'jo', nombre: 'Jordania' },

    // Grupo K
    { id: 'pt', nombre: 'Portugal' },
    { id: 'cd', nombre: 'República Democrática del Congo' },
    { id: 'uz', nombre: 'Uzbekistán' },
    { id: 'co', nombre: 'Colombia' },

    // Grupo L
    { id: 'gb-eng', nombre: 'Inglaterra' },
    { id: 'hr', nombre: 'Croacia' },
    { id: 'gh', nombre: 'Ghana' },
    { id: 'pa', nombre: 'Panamá' },
  ];

  nuevaFase = signal('');
  nuevoEquipoLocal = signal('');
  nuevoEquipoVisitante = signal('');
  nuevaFechaHora = signal('');

  formularioNuevoPartidoValido = computed(() => {
    return (
      this.nuevaFase().trim().length > 0 &&
      this.nuevoEquipoLocal() !== '' &&
      this.nuevoEquipoVisitante() !== '' &&
      this.nuevaFechaHora() !== '' &&
      this.nuevoEquipoLocal() !== this.nuevoEquipoVisitante()
    );
  });

  mensajeToast = signal('');
  mostrarToast = signal(false);
  esErrorToast = signal(false);

  monitoreoDatos = signal<any[]>([]);
  tabActual = signal<'registro' | 'finalizar' | 'programar' | 'monitoreo' | 'aciertos'>(
    'finalizar',
  );

  usuariosDisponibles = signal<any[]>([]);
  usuarioHistorialId = signal<number | null>(null);
  historialAciertos = signal<any[]>([]);

  ngOnInit() {
    this.cargarPartidosPendientes();
    this.http.get<any[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: (data) => this.usuariosDisponibles.set(data.filter((u) => u.id !== 1)),
    });
  }

  cargarPartidosPendientes() {
    this.http.get<any[]>(`${environment.apiUrl}/partidos`).subscribe({
      next: (data) => {
        this.partidosPendientes.set(data.filter((p) => p.estado !== 'FINALIZADO'));
      },
      error: (err) => console.error('Error cargando partidos', err),
    });
  }

  registrarUsuario() {
    if (!this.formularioValido()) {
      this.lanzarToast('Completa el nombre y un PIN de 4 dígitos..', true);
      return;
    }

    const payload = {
      nombre: this.nombre().trim(),
      pin: String(this.pin()),
      avatar: this.avatar(),
      es_admin: false,
    };

    this.http.post(`${environment.apiUrl}/usuarios`, payload).subscribe({
      next: () => {
        this.lanzarToast('Te has registrado correctamente..', false);
        this.nombre.set('');
        this.pin.set('');
      },
      error: (err) => {
        console.error('Error al registrar', err);
        this.lanzarToast('Hubo un error al registrar..', true);
      },
    });
  }

  guardarResultado() {
    if (!this.formularioPartidoValido()) return;

    const payload = {
      golesLocal: Number(this.golesLocal()),
      golesVisitante: Number(this.golesVisitante()),
    };

    const url = `${environment.apiUrl}/partidos/${this.partidoSeleccionadoId()}/finalizar`;

    this.http.patch(url, payload).subscribe({
      next: () => {
        this.lanzarToast('Resultado registrado correctamente..', false);
        this.partidoSeleccionadoId.set(null);
        this.golesLocal.set(null);
        this.golesVisitante.set(null);
        this.grupoAdminSeleccionado.set('TODOS');
        this.cargarPartidosPendientes();
      },
      error: (err) => {
        console.error('Error al finalizar partido', err);
        this.lanzarToast('Error al guardar el resultado..', true);
      },
    });
  }

  crearPartido() {
    if (!this.formularioNuevoPartidoValido()) return;

    const payload = {
      fase: this.nuevaFase(),
      equipoLocal: this.nuevoEquipoLocal(),
      equipoVisitante: this.nuevoEquipoVisitante(),
      fechaHora: this.nuevaFechaHora(),
    };

    this.http.post(`${environment.apiUrl}/partidos`, payload).subscribe({
      next: () => {
        this.lanzarToast('Partido creado exitosamente..', false);
        this.nuevaFase.set('');
        this.nuevoEquipoLocal.set('');
        this.nuevoEquipoVisitante.set('');
        this.nuevaFechaHora.set('');

        this.cargarPartidosPendientes();
      },
      error: (err) => {
        console.error('Error al crear partido', err);
        this.lanzarToast('Error al programar el partido..', true);
      },
    });
  }

  eliminarPartido() {
    if (
      !this.partidoSeleccionadoId() ||
      !confirm('¿Estás seguro de que deseas eliminar este partido de la base de datos?')
    ) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/partidos/${this.partidoSeleccionadoId()}`).subscribe({
      next: () => {
        this.lanzarToast('Partido eliminado correctamente..', false);
        this.partidoSeleccionadoId.set(null);
        this.golesLocal.set(null);
        this.golesVisitante.set(null);
        this.cargarPartidosPendientes();
      },
      error: (err) => {
        console.error('Error al eliminar partido', err);
        this.lanzarToast('Error al intentar eliminar..', true);
      },
    });
  }

  lanzarToast(mensaje: string, esError: boolean) {
    this.mensajeToast.set(mensaje);
    this.esErrorToast.set(esError);
    this.mostrarToast.set(true);

    setTimeout(() => {
      this.mostrarToast.set(false);
    }, 3000);
  }

  cargarMonitoreo() {
    const hoy = new Date();
    const strHoy = hoy.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });

    forkJoin({
      usuarios: this.http.get<any[]>(`${environment.apiUrl}/usuarios`),
      partidos: this.http.get<any[]>(`${environment.apiUrl}/partidos`),
      votos: this.http.get<any[]>(`${environment.apiUrl}/votos`),
    }).subscribe({
      next: (res) => {
        const partidosHoy = res.partidos.filter((p: any) => {
          const fechaCorta = new Date(p.fechaHora).toLocaleDateString('es-BO', {
            day: '2-digit',
            month: 'short',
          });
          return fechaCorta === strHoy && p.estado !== 'FINALIZADO';
        });

        const totalHoy = partidosHoy.length;

        const reporte = res.usuarios
          .filter((u) => u.id !== 1)
          .map((u) => {
            const votosUsuario = res.votos.filter(
              (v) => v.usuarioId === u.id && partidosHoy.some((p) => p.id === v.partidoId),
            );

            return {
              nombre: u.nombre,
              avatar: u.avatar,
              votosHechos: votosUsuario.length,
              totalHoy: totalHoy,
              completado: votosUsuario.length === totalHoy && totalHoy > 0,
            };
          });

        reporte.sort((a, b) => a.votosHechos - b.votosHechos);

        this.monitoreoDatos.set(reporte);
      },
      error: (err) => console.error('Error cargando monitoreo', err),
    });
  }

  seleccionarUsuarioHistorial(event: Event) {
    const userId = Number((event.target as HTMLSelectElement).value);
    this.cargarHistorialUsuario(userId);
  }

  cargarHistorialUsuario(idUsuario: number) {
    this.usuarioHistorialId.set(idUsuario);

    forkJoin({
      partidos: this.http.get<any[]>(`${environment.apiUrl}/partidos`),
      votos: this.http.get<any[]>(`${environment.apiUrl}/votos`),
    }).subscribe({
      next: (res) => {
        const partidosFinalizados = res.partidos.filter((p: any) => p.estado === 'FINALIZADO');
        const votosDelUsuario = res.votos.filter((v: any) => v.usuarioId === idUsuario);

        const aciertos = [];

        for (const partido of partidosFinalizados) {
          const voto = votosDelUsuario.find((v: any) => v.partidoId === partido.id);

          if (voto) {
            let resultadoReal = 'EMPATE';
            if (partido.golesLocal > partido.golesVisitante) resultadoReal = 'LOCAL';
            if (partido.golesLocal < partido.golesVisitante) resultadoReal = 'VISITANTE';

            if (voto.pronostico === resultadoReal) {
              const eqLocal = this.equiposDisponibles.find((e) => e.id === partido.equipoLocal);
              const eqVisita = this.equiposDisponibles.find(
                (e) => e.id === partido.equipoVisitante,
              );

              aciertos.push({
                ...partido,
                nombreLocal: eqLocal ? eqLocal.nombre : partido.equipoLocal.toUpperCase(),
                banderaLocal: `https://flagcdn.com/w40/${partido.equipoLocal}.png`,
                nombreVisitante: eqVisita ? eqVisita.nombre : partido.equipoVisitante.toUpperCase(),
                banderaVisitante: `https://flagcdn.com/w40/${partido.equipoVisitante}.png`,
                pronosticoAdivinado: voto.pronostico,
              });
            }
          }
        }

        aciertos.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
        this.historialAciertos.set(aciertos);
      },
    });
  }

  recordarPorWhatsApp(nombre: string) {
    const mensaje = `${nombre}!! Hay partidos..y están por comenzar..aún te falta registrar tus pronósticos`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }
}
