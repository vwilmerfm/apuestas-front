import { Component, output, signal, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit {
  private http = inject(HttpClient);

  loginExitoso = output<number>();

  usuarios = signal<any[]>([]);
  usuarioSeleccionado = signal<any | null>(null);

  pinDigitos = signal<string[]>(['', '', '', '']);
  errorPin = signal<boolean>(false);
  contadorClicks = signal<number>(0);

  @ViewChild('caja1') primerInput!: ElementRef<HTMLInputElement>;

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: (data) => {
        this.usuarios.set(data.filter((u) => u.id !== 1));
      },
      error: (err) => console.error('Error cargando usuarios', err),
    });
  }

  seleccionarUsuario(user: any) {
    this.usuarioSeleccionado.set(user);
    this.pinDigitos.set(['', '', '', '']);
    this.errorPin.set(false);
    setTimeout(() => {
      if (this.primerInput) {
        this.primerInput.nativeElement.focus();
      }
    }, 50);
  }

  onInput(event: Event, index: number, nextInput: HTMLInputElement | null) {
    const input = event.target as HTMLInputElement;
    const valor = input.value.replace(/[^0-9]/g, '');
    input.value = valor;

    const digitos = [...this.pinDigitos()];
    digitos[index] = valor;
    this.pinDigitos.set(digitos);
    this.errorPin.set(false);

    if (valor && nextInput) {
      nextInput.focus();
    }

    this.verificarPin();
  }

  onKeyDown(event: KeyboardEvent, index: number, prevInput: HTMLInputElement | null) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && prevInput) {
      prevInput.focus();
    }
  }

  verificarPin() {
    const pinCompleto = this.pinDigitos().join('');

    if (pinCompleto.length === 4) {
      const payload = {
        usuarioId: this.usuarioSeleccionado().id,
        pin: pinCompleto,
      };

      this.http
        .post<{ valido: boolean; token?: string }>(`${environment.apiUrl}/auth/login`, payload)
        .subscribe({
          next: (respuesta) => {
            if (respuesta.valido && respuesta.token) {
              localStorage.setItem('jwt_token', respuesta.token);
              localStorage.setItem('usuarioApuestaId', this.usuarioSeleccionado().id.toString());
              this.loginExitoso.emit(this.usuarioSeleccionado().id);
            } else {
              this.marcarError();
            }
          },
          error: (err) => {
            console.error('Error validando PIN', err);
            this.marcarError();
          },
        });
    }
  }

  marcarError() {
    this.errorPin.set(true);
    this.pinDigitos.set(['', '', '', '']);

    setTimeout(() => {
      if (this.primerInput) {
        this.primerInput.nativeElement.focus();
      }
    }, 50);
  }

  volver() {
    this.usuarioSeleccionado.set(null);
  }

  activarLoginOculto() {
    this.contadorClicks.update((c) => c + 1);

    if (this.contadorClicks() === 5) {
      this.seleccionarUsuario({ id: 1, nombre: 'Administrador', avatar: '⚙️' });
      this.contadorClicks.set(0);
    }
  }
}
