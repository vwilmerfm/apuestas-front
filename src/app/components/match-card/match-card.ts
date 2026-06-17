import { Component, input, output, signal, OnInit, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import confetti from 'canvas-confetti';

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

  celebrarAcierto() {
    if (this.resultadoApuesta() === 'ACERTO') {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      const audio = new Audio('assets/sii.mp3');
      audio.play().catch((e) => console.log('Audio bloqueado por el navegador'));

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#00e676', '#00e5ff'],
      });
    }
  }
}
