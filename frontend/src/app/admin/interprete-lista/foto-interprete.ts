import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { InterpreteService } from '../../core/interprete.service';
import { Interprete } from '../../core/models';

/**
 * Foto do intérprete. A foto é privada (exige login), então não dá para usar a URL direto no
 * <img>: ela é baixada com o token e exibida a partir da memória do navegador.
 */
@Component({
  selector: 'app-foto-interprete',
  host: { class: 'foto-interprete', '[style.--tamanho]': 'tamanho() + "px"' },
  template: `
    @if (url(); as src) {
      <img [src]="src" [alt]="'Foto de ' + interprete().nome" />
    } @else {
      <span class="foto-iniciais" aria-hidden="true">{{ iniciais() }}</span>
    }
  `,
})
export class FotoInterprete {
  private readonly service = inject(InterpreteService);

  readonly interprete = input.required<Pick<Interprete, 'id' | 'nome' | 'temFoto' | 'atualizadoEm'>>();
  readonly tamanho = input(48);

  protected readonly url = signal<string | null>(null);
  protected readonly iniciais = computed(() => {
    const partes = this.interprete().nome.trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  });

  constructor() {
    effect((onCleanup) => {
      const i = this.interprete();
      untracked(() => this.liberar()); // sem untracked, ler url() aqui faria o efeito rodar em laço
      if (!i.temFoto) return;
      const sub = this.service.foto(i.id).subscribe({
        next: (blob) => this.url.set(URL.createObjectURL(blob)),
        error: () => this.url.set(null),
      });
      onCleanup(() => sub.unsubscribe());
    });
    inject(DestroyRef).onDestroy(() => this.liberar());
  }

  private liberar(): void {
    const atual = this.url();
    if (atual) URL.revokeObjectURL(atual);
    this.url.set(null);
  }
}
