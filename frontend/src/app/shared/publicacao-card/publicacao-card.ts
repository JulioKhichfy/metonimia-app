import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { corTextoPara, urlIncorporacao } from '../../core/midia';
import { Midia, Publicacao, ROTULOS } from '../../core/models';
import { DataHoraPipe } from '../data-hora.pipe';
import { SafeHtmlPipe } from '../safe-html.pipe';

interface VideoIncorporado {
  url: string;
  seguro: SafeResourceUrl;
  descricao: string;
}

/** Renderiza uma palestra/evento. Usado no site público e na pré-visualização do painel. */
@Component({
  selector: 'app-publicacao-card',
  imports: [DataHoraPipe, SafeHtmlPipe],
  templateUrl: './publicacao-card.html',
})
export class PublicacaoCard {
  private readonly sanitizer = inject(DomSanitizer);

  readonly publicacao = input.required<Publicacao>();

  protected readonly ancora = computed(() => `${ROTULOS[this.publicacao().tipo].singular}-${this.publicacao().id}`);
  protected readonly corTexto = computed(() => corTextoPara(this.publicacao().corFundo));
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
