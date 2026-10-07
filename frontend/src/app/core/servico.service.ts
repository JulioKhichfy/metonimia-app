import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Servico, ServicoPayload } from './models';

@Injectable({ providedIn: 'root' })
export class ServicoService {
  private readonly http = inject(HttpClient);

  /** Site público: não exige login. */
  listarPublicos(): Observable<Servico[]> {
    return this.http.get<Servico[]>('/api/public/servicos');
  }

  listar(): Observable<Servico[]> {
    return this.http.get<Servico[]>('/api/admin/servicos');
  }

  criar(payload: ServicoPayload): Observable<Servico> {
    return this.http.post<Servico>('/api/admin/servicos', payload);
  }

  atualizar(id: number, payload: ServicoPayload): Observable<Servico> {
    return this.http.put<Servico>(`/api/admin/servicos/${id}`, payload);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/servicos/${id}`);
  }
}
