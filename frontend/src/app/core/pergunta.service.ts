import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Pergunta, PerguntaPayload } from './models';

@Injectable({ providedIn: 'root' })
export class PerguntaService {
  private readonly http = inject(HttpClient);

  /** Site público: não exige login. */
  listarPublicas(): Observable<Pergunta[]> {
    return this.http.get<Pergunta[]>('/api/public/perguntas');
  }

  listar(): Observable<Pergunta[]> {
    return this.http.get<Pergunta[]>('/api/admin/perguntas');
  }

  criar(payload: PerguntaPayload): Observable<Pergunta> {
    return this.http.post<Pergunta>('/api/admin/perguntas', payload);
  }

  atualizar(id: number, payload: PerguntaPayload): Observable<Pergunta> {
    return this.http.put<Pergunta>(`/api/admin/perguntas/${id}`, payload);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/perguntas/${id}`);
  }
}
