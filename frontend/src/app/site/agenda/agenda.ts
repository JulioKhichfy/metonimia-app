import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { ehFutura, Publicacao, ROTULOS, TipoPublicacao } from '../../core/models';
import { PublicacaoService } from '../../core/publicacao.service';
import { PublicacaoCard } from '../../shared/publicacao-card/publicacao-card';

const PASSADAS_POR_PAGINA = 4;

/**
 * Seção pública de palestras ou eventos.
 * A separação futuras/passadas é recalculada a cada minuto: quando a data/hora
 * de uma publicação passa, ela muda de bloco sozinha, sem recarregar a página.
 */
@Component({
  selector: 'app-agenda',
  imports: [PublicacaoCard],
  templateUrl: './agenda.html',
})
export class Agenda implements OnInit {
  private readonly service = inject(PublicacaoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tipo = input.required<TipoPublicacao>();

  protected readonly r = computed(() => ROTULOS[this.tipo()]);
  protected readonly itens = signal<Publicacao[]>([]);
  protected readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');
  protected readonly agora = signal(Date.now());
  protected readonly limitePassadas = signal(PASSADAS_POR_PAGINA);

  protected readonly futuras = computed(() =>
    this.itens()
      .filter((p) => ehFutura(p, this.agora()))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora)),
  );
  protected readonly passadas = computed(() =>
    this.itens()
      .filter((p) => !ehFutura(p, this.agora()))
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
  );
  protected readonly passadasVisiveis = computed(() => this.passadas().slice(0, this.limitePassadas()));

  ngOnInit(): void {
    const sub = this.service.listarPublicas(this.tipo()).subscribe({
      next: (lista) => {
        this.itens.set(lista);
        this.estado.set('ok');
      },
      error: () => this.estado.set('erro'),
    });
    const relogio = setInterval(() => this.agora.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      clearInterval(relogio);
    });
  }

  protected verMais(): void {
    this.limitePassadas.update((n) => n + PASSADAS_POR_PAGINA);
  }
}
