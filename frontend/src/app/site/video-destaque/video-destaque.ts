import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';

const PASSO_VOLUME = 0.1;

/**
 * Vídeo de destaque (depoimento em Libras), na largura do conteúdo do site.
 * Começa sem som e em loop; os controles próprios permitem pausar, ligar/desligar o som e
 * ajustar o volume. Pausa sozinho quando sai da tela (ou da aba) e continua ao voltar.
 * Quem pediu "menos movimento" no sistema não recebe reprodução automática.
 */
@Component({
  selector: 'app-video-destaque',
  template: `
    <section class="video-destaque" aria-labelledby="video-destaque-titulo">
      <h2 id="video-destaque-titulo" class="sr-only">Depoimento de uma intérprete de Libras</h2>
      <div class="video-moldura">
      <video
        #video
        src="videos/depoimento_interpretelibras.mp4"
        muted
        loop
        playsinline
        preload="metadata"
        aria-describedby="video-destaque-titulo"
        (play)="tocando.set(true)"
        (pause)="tocando.set(false)"
        (volumechange)="sincronizar()"
        (click)="alternarReproducao()"
      ></video>

      <div class="video-controles" role="group" aria-label="Controles do vídeo">
        <button type="button" class="video-botao" (click)="alternarReproducao()" [attr.aria-label]="tocando() ? 'Pausar vídeo' : 'Reproduzir vídeo'">
          <span class="material-icons" aria-hidden="true">{{ tocando() ? 'pause' : 'play_arrow' }}</span>
        </button>
        <button type="button" class="video-botao video-botao-som" (click)="alternarSom()" [attr.aria-pressed]="!mudo()">
          <span class="material-icons" aria-hidden="true">{{ mudo() ? 'volume_off' : 'volume_up' }}</span>
          <span>{{ mudo() ? 'Ativar som' : 'Desativar som' }}</span>
        </button>
        @if (volumeAjustavel()) {
          <button type="button" class="video-botao" (click)="mudarVolume(-1)" [disabled]="volume() <= 0" aria-label="Diminuir volume">
            <span class="material-icons" aria-hidden="true">remove</span>
          </button>
          <span class="video-volume" aria-live="polite">{{ mudo() ? 'Sem som' : 'Volume ' + volumePercentual() + '%' }}</span>
          <button type="button" class="video-botao" (click)="mudarVolume(1)" [disabled]="!mudo() && volume() >= 1" aria-label="Aumentar volume">
            <span class="material-icons" aria-hidden="true">add</span>
          </button>
        }
      </div>
      </div>
    </section>
  `,
})
export class VideoDestaque {
  private readonly destroyRef = inject(DestroyRef);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  protected readonly tocando = signal(false);
  protected readonly mudo = signal(true);
  protected readonly volume = signal(1);
  /** iPhone/iPad não permitem mudar o volume por código (só pelos botões do aparelho). */
  protected readonly volumeAjustavel = signal(true);
  protected readonly volumePercentual = computed(() => Math.round(this.volume() * 100));

  /**
   * O visitante quer o vídeo tocando? Começa true (autoplay), vira false quando ele pausa e true
   * quando ele dá play ou liga o som. Sair da tela pausa o vídeo, mas não muda essa intenção:
   * ao voltar, ele continua de onde parou.
   */
  private querTocando = false;
  private visivel = false;

  constructor() {
    afterNextRender(() => {
      const v = this.video().nativeElement;
      v.muted = true; // garante o "sem som" antes de tocar (exigência dos navegadores para autoplay)
      this.volumeAjustavel.set(volumePodeMudar(v));
      this.querTocando = !matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Toca só enquanto pelo menos 1/4 do vídeo estiver na tela
      const observador = new IntersectionObserver(
        ([entrada]) => {
          this.visivel = entrada.intersectionRatio >= 0.25;
          this.aplicar();
        },
        { threshold: [0, 0.25] },
      );
      observador.observe(v);
      // Trocar de aba ou minimizar o navegador também pausa
      const aoMudarAba = () => this.aplicar();
      document.addEventListener('visibilitychange', aoMudarAba);
      this.destroyRef.onDestroy(() => {
        observador.disconnect();
        document.removeEventListener('visibilitychange', aoMudarAba);
      });
    });
  }

  /** Toca ou pausa conforme a intenção do visitante e a visibilidade do vídeo. */
  private aplicar(): void {
    const v = this.video().nativeElement;
    const deveTocar = this.querTocando && this.visivel && !document.hidden;
    if (deveTocar && v.paused) {
      // Recomeça a decodificação a partir de um quadro-chave. Sem isso, alguns navegadores
      // retomam só o áudio e a imagem fica congelada até o próximo quadro-chave do arquivo.
      if (v.readyState > 0) v.currentTime = v.currentTime;
      v.play().catch(() => {}); // se o navegador bloquear, o visitante usa o botão de reproduzir
    } else if (!deveTocar && !v.paused) {
      v.pause();
    }
  }

  protected alternarReproducao(): void {
    this.querTocando = this.video().nativeElement.paused;
    this.visivel = true; // quem clicou está vendo o vídeo
    this.aplicar();
  }

  protected alternarSom(): void {
    const v = this.video().nativeElement;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 0.5;
    if (!v.muted) this.tocarPorPedido();
  }

  protected mudarVolume(direcao: 1 | -1): void {
    const v = this.video().nativeElement;
    if (direcao > 0 && v.muted) {
      v.muted = false; // aumentar volume com o som desligado liga o som
      this.tocarPorPedido();
      return;
    }
    v.volume = Math.min(1, Math.max(0, Math.round((v.volume + direcao * PASSO_VOLUME) * 10) / 10));
    if (v.volume === 0) v.muted = true;
  }

  private tocarPorPedido(): void {
    this.querTocando = true;
    this.visivel = true;
    this.aplicar();
  }

  protected sincronizar(): void {
    const v = this.video().nativeElement;
    this.mudo.set(v.muted || v.volume === 0);
    this.volume.set(v.volume);
  }
}

function volumePodeMudar(v: HTMLVideoElement): boolean {
  const original = v.volume;
  v.volume = 0.5;
  const pode = v.volume === 0.5;
  v.volume = original;
  return pode;
}
