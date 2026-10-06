import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Publicacao, PublicacaoPayload, TipoPublicacao } from './models';

@Injectable({ providedIn: 'root' })
export class PublicacaoService {
  private readonly http = inject(HttpClient);

  /** Site público: não exige login. */
  listarPublicas(tipo: TipoPublicacao): Observable<Publicacao[]> {
    return this.http.get<Publicacao[]>('/api/public/publicacoes', { params: { tipo } });
  }

  listar(tipo: TipoPublicacao): Observable<Publicacao[]> {
    return this.http.get<Publicacao[]>('/api/admin/publicacoes', { params: { tipo } });
  }

  criar(payload: PublicacaoPayload): Observable<Publicacao> {
    return this.http.post<Publicacao>('/api/admin/publicacoes', payload);
  }

  atualizar(id: number, payload: PublicacaoPayload): Observable<Publicacao> {
    return this.http.put<Publicacao>(`/api/admin/publicacoes/${id}`, payload);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/publicacoes/${id}`);
  }
}
