import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

const CHAVE = 'metonimia.admin.token';

interface RespostaLogin {
  token: string;
  expiraEm: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenAtual = signal<string | null>(lerToken());

  readonly logado = computed(() => this.tokenAtual() !== null);

  /** Retorna o token válido ou null (e encerra a sessão se tiver expirado). */
  token(): string | null {
    const t = this.tokenAtual();
    if (t && expirado(t)) {
      this.sair();
      return null;
    }
    return t;
  }

  entrar(usuario: string, senha: string): Observable<void> {
    return this.http.post<RespostaLogin>('/api/auth/login', { username: usuario, password: senha }).pipe(
      tap((r) => {
        salvarToken(r.token);
        this.tokenAtual.set(r.token);
      }),
      map(() => undefined),
    );
  }

  sair(): void {
    salvarToken(null);
    this.tokenAtual.set(null);
    void this.router.navigate(['/admin/login']);
  }
}

function lerToken(): string | null {
  try {
    const t = localStorage.getItem(CHAVE);
    return t && !expirado(t) ? t : null;
  } catch {
    return null;
  }
}

function salvarToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CHAVE, token);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* navegação privada sem storage: a sessão dura até recarregar a página */
  }
}

function expirado(token: string): boolean {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64)) as { exp?: number };
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
