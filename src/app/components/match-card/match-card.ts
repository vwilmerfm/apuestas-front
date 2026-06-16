import { Component, input, output, signal, OnInit, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './match-card.html',
  styleUrls: ['./match-card.css'],
})
export class MatchCard implements OnInit {
  partido = input.required<{
    id: number;
    fase: string;
    grupo: string;
    equipoLocal: { nombre: string; bandera: string };
    equipoVisitante: { nombre: string; bandera: string };
    fecha: string;
    votoPrevio: string | null;
    estado: string;
    golesLocal: number | null;
    golesVisitante: number | null;
  }>();

  votoEmitido = output<string>();
  votoActual = signal<string | null>(null);
  yaVoto = signal<boolean>(false);

  resultadoApuesta = computed(() => {
    const p = this.partido();

    if (p.estado !== 'FINALIZADO' || !this.votoActual()) return 'PENDIENTE';

    let resultadoReal = 'EMPATE';
    if (p.golesLocal! > p.golesVisitante!) resultadoReal = 'LOCAL';
    if (p.golesLocal! < p.golesVisitante!) resultadoReal = 'VISITANTE';

    return this.votoActual() === resultadoReal ? 'ACERTO' : 'FALLO';
  });

  ngOnInit() {
    const previo = this.partido().votoPrevio;
    if (previo) {
      this.votoActual.set(previo);
      this.yaVoto.set(true);
    }
  }

  votar(pronostico: string) {
    if (this.yaVoto()) return;
    this.votoActual.set(pronostico);
    this.yaVoto.set(true);
    this.votoEmitido.emit(pronostico);
  }
}
