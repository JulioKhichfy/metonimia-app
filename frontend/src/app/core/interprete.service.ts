import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Interprete, InterpretePayload, MensagemPayload, MensagemResultado } from './models';

const BASE = '/api/admin/interpretes';

@Injectable({ providedIn: 'root' })
export class InterpreteService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Interprete[]> {
    return this.http.get<Interprete[]>(BASE);
  }

  criar(dados: InterpretePayload, foto: File | null): Observable<Interprete> {
    return this.http.post<Interprete>(BASE, formulario(dados, foto));
  }

  atualizar(id: number, dados: InterpretePayload, foto: File | null): Observable<Interprete> {
    return this.http.put<Interprete>(`${BASE}/${id}`, formulario(dados, foto));
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  /** A foto é privada: vem pela API com o token e vira um endereço local (blob:) para o <img>. */
  foto(id: number): Observable<Blob> {
    return this.http.get(`${BASE}/${id}/foto`, { responseType: 'blob' });
  }

  emailConfigurado(): Observable<boolean> {
    return this.http
      .get<{ emailConfigurado: boolean }>(`${BASE}/mensagens/configuracao`)
      .pipe(map((r) => r.emailConfigurado));
  }

  enviarMensagem(payload: MensagemPayload): Observable<MensagemResultado> {
    return this.http.post<MensagemResultado>(`${BASE}/mensagens`, payload);
  }
}

/** multipart: parte "dados" (JSON) + parte "foto" (opcional), como o backend espera. */
function formulario(dados: InterpretePayload, foto: File | null): FormData {
  const fd = new FormData();
  fd.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));
  if (foto) fd.append('foto', foto, foto.name);
  return fd;
}

/** "21999990000" → "(21) 99999-0000" */
export function formatarCelular(digitos: string): string {
  const d = digitos.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(d);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}
