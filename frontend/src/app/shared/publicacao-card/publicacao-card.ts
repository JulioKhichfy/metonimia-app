import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { COR_HEX, corTextoPara, misturar, urlIncorporacao } from '../../core/midia';
import { Midia, Publicacao, ROTULOS } from '../../core/models';
import { redesDa } from '../../core/redes';
import { DataHoraPipe } from '../data-hora.pipe';
import { LogoRede } from '../logo-rede';
import { SafeHtmlPipe } from '../safe-html.pipe';

interface VideoIncorporado {
  url: string;
  seguro: SafeResourceUrl;
  descricao: string;
}

/** Altura da faixa de transição em cada borda do card. */
const FAIXA_DEGRADE = '56px';

/** Renderiza uma palestra/evento. Usado no site público e na pré-visualização do painel. */
@Component({
  selector: 'app-publicacao-card',
  imports: [DataHoraPipe, SafeHtmlPipe, LogoRede],
  templateUrl: './publicacao-card.html',
})
export class PublicacaoCard {
  private readonly sanitizer = inject(DomSanitizer);

  readonly publicacao = input.required<Publicacao>();
  /** Cores de fundo dos cards vizinhos: as bordas fazem um degradê até a metade do caminho. */
  readonly corAnterior = input<string | null>(null);
  readonly corProxima = input<string | null>(null);

  protected readonly ancora = computed(() => `${ROTULOS[this.publicacao().tipo].singular}-${this.publicacao().id}`);
  protected readonly corTexto = computed(() => this.publicacao().corTexto || corTextoPara(this.publicacao().corFundo));
  /**
   * Cards vizinhos se encontram na cor intermediária entre os dois, então a emenda fica contínua
   * e a mudança de cor se espalha por duas faixas em vez de acontecer de uma vez.
   */
  protected readonly degrade = computed(() => {
    const cor = this.publicacao().corFundo;
    const antes = this.corAnterior();
    const depois = this.corProxima();
    const valida = (c: string | null): c is string => !!c && COR_HEX.test(c) && COR_HEX.test(cor) && c.toLowerCase() !== cor.toLowerCase();
    if (!valida(antes) && !valida(depois)) return null;
    const topo = valida(antes) ? misturar(antes, cor) : cor;
    const base = valida(depois) ? misturar(cor, depois) : cor;
    return `linear-gradient(180deg, ${topo} 0, ${cor} ${FAIXA_DEGRADE}, ${cor} calc(100% - ${FAIXA_DEGRADE}), ${base} 100%)`;
  });
  protected readonly redes = computed(() => redesDa(this.publicacao()));
  protected readonly fotos = computed(() => this.midias('IMAGEM'));
  protected readonly videos = computed(() => this.midias('VIDEO'));
  protected readonly incorporados = computed<VideoIncorporado[]>(() =>
    this.midias('VIDEO_LINK').flatMap((m) => {
      const url = urlIncorporacao(m.url);
      return url
        ? [{ url, seguro: this.sanitizer.bypassSecurityTrustResourceUrl(url), descricao: m.descricao ?? '' }]
        : [];
    }),
  );

  protected textoAlternativo(foto: Midia, indice: number): string {
    if (foto.descricao?.trim()) return foto.descricao.trim();
    const p = this.publicacao();
    return `Foto ${indice + 1} de ${ROTULOS[p.tipo].singular} em ${p.local}`;
  }

  private midias(tipo: Midia['tipo']): Midia[] {
    return (this.publicacao().midias ?? []).filter((m) => m.tipo === tipo);
  }
}
