import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { Midia } from './models';

export interface ProgressoUpload {
  progresso: number;
  midia?: Midia;
}

export const LIMITE_IMAGEM_MB = 10;
export const LIMITE_VIDEO_MB = 200;

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  enviar(arquivo: File): Observable<ProgressoUpload> {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http
      .post<Midia>('/api/admin/uploads', dados, { reportProgress: true, observe: 'events' })
      .pipe(
        map((ev): ProgressoUpload | null => {
          if (ev.type === HttpEventType.UploadProgress) {
            return { progresso: ev.total ? Math.round((100 * ev.loaded) / ev.total) : 0 };
          }
          if (ev.type === HttpEventType.Response && ev.body) {
            return { progresso: 100, midia: ev.body };
          }
          return null;
        }),
        filter((p): p is ProgressoUpload => p !== null),
      );
  }
}
