import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ehFutura, Publicacao, ROTULOS, TipoPublicacao } from '../../core/models';
import { PublicacaoService } from '../../core/publicacao.service';
import { DataHoraPipe } from '../../shared/data-hora.pipe';
import { PublicacaoCard } from '../../shared/publicacao-card/publicacao-card';
import { PublicacaoForm } from '../publicacao-form/publicacao-form';

@Component({
  selector: 'app-publicacao-lista',
  imports: [MatExpansionModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, DataHoraPipe, PublicacaoCard, PublicacaoForm],
  templateUrl: './publicacao-lista.html',
})
export class PublicacaoLista implements OnInit {
  private readonly service = inject(PublicacaoService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  /** Vem do `data` da rota (withComponentInputBinding). */
  readonly tipo = input.required<TipoPublicacao>();

  protected readonly r = computed(() => ROTULOS[this.tipo()]);
  protected readonly itens = signal<Publicacao[]>([]);
  protected readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');
  protected readonly criando = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly agora = signal(Date.now());

  /** Ordenadas por data decrescente (mais recente primeiro). */
  protected readonly ordenadas = computed(() =>
    [...this.itens()].sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
  );

  ngOnInit(): void {
    this.carregar();
    const relogio = setInterval(() => this.agora.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  protected carregar(): void {
    this.estado.set('carregando');
    this.service.listar(this.tipo()).subscribe({
      next: (lista) => {
        this.itens.set(lista);
        this.estado.set('ok');
      },
      error: () => this.estado.set('erro'),
    });
  }

  protected futura(p: Publicacao): boolean {
    return ehFutura(p, this.agora());
  }

  protected aoCriar(p: Publicacao): void {
    this.itens.update((lista) => [...lista, p]);
    this.criando.set(false);
    this.avisar(`${this.capital(this.r().singular)} adicionad${this.r().artigo}.`);
  }

  protected aoAtualizar(p: Publicacao): void {
    this.itens.update((lista) => lista.map((x) => (x.id === p.id ? p : x)));
    this.editandoId.set(null);
    this.avisar(`${this.capital(this.r().singular)} atualizad${this.r().artigo}.`);
  }

  protected excluir(p: Publicacao): void {
    const r = this.r();
    if (!confirm(`Excluir ${r.artigo} ${r.singular} de ${p.local}? Fotos e vídeos enviados também serão apagados.`)) return;
    this.service.excluir(p.id).subscribe({
      next: () => {
        this.itens.update((lista) => lista.filter((x) => x.id !== p.id));
        this.avisar(`${this.capital(r.singular)} excluíd${r.artigo}.`);
      },
      error: (e: HttpErrorResponse) => this.avisar(`Não foi possível excluir (erro ${e.status}). Tente de novo.`),
    });
  }

  private avisar(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }

  private capital(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
