import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly entrando = signal(false);
  protected readonly erro = signal('');
  protected readonly mostrarSenha = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    usuario: ['', Validators.required],
    senha: ['', Validators.required],
  });

  constructor() {
    if (this.auth.token()) void this.router.navigate(['/admin']);
  }

  protected entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.entrando.set(true);
    this.erro.set('');
    const { usuario, senha } = this.form.getRawValue();
    this.auth.entrar(usuario, senha).subscribe({
      next: () => void this.router.navigate(['/admin']),
      error: (e: HttpErrorResponse) => {
        this.entrando.set(false);
        this.erro.set(
          e.status === 401
            ? 'Usuário ou senha incorretos.'
            : e.status === 429
              ? 'Muitas tentativas seguidas. Aguarde 15 minutos e tente de novo.'
              : 'O servidor não respondeu. Verifique se o backend está no ar e tente de novo.',
        );
      },
    });
  }
}
