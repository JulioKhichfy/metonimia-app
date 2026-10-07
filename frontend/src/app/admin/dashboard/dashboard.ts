import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIconModule],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly http = inject(HttpClient);

  protected readonly baixando = signal(false);
  protected readonly status = signal<{ texto: string; erro: boolean } | null>(null);

  /** Baixa o .sql gerado pela API (a requisição leva o token, por isso não é um link direto). */
  protected baixarBackup(): void {
    this.baixando.set(true);
    this.status.set(null);
    this.http.get('/api/admin/backup', { responseType: 'blob', observe: 'response' }).subscribe({
      next: (resposta) => {
        const nome =
          /filename="?([^";]+)"?/.exec(resposta.headers.get('Content-Disposition') ?? '')?.[1] ?? 'metonimia-backup.sql';
        const url = URL.createObjectURL(resposta.body!);
        const link = document.createElement('a');
        link.href = url;
        link.download = nome;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.baixando.set(false);
        this.status.set({ texto: `Backup salvo como ${nome}. Guarde o arquivo em local seguro.`, erro: false });
      },
      error: () => {
        this.baixando.set(false);
        this.status.set({ texto: 'Não foi possível gerar o backup. Tente novamente em instantes.', erro: true });
      },
    });
  }
}
