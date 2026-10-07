import { Component, input } from '@angular/core';
import { RedeSocial } from '../core/redes';

/** Logotipo da rede social em SVG. Decorativo: o nome da rede vai sempre em texto ao lado. */
@Component({
  selector: 'app-logo-rede',
  host: { '[class]': '"logo-rede logo-" + rede()' },
  template: `
    @switch (rede()) {
      @case ('youtube') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="#ff0000"
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
          />
          <path fill="#ffffff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      }
      @case ('instagram') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient [id]="gradiente" cx="30%" cy="107%" r="150%">
              <stop offset="0" stop-color="#fdf497" />
              <stop offset=".05" stop-color="#fdf497" />
              <stop offset=".45" stop-color="#fd5949" />
              <stop offset=".6" stop-color="#d6249f" />
              <stop offset=".9" stop-color="#285aeb" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" [attr.fill]="'url(#' + gradiente + ')'" />
          <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" stroke-width="1.8" />
          <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" stroke-width="1.8" />
          <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
        </svg>
      }
      @case ('x') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
          />
        </svg>
      }
    }
  `,
})
export class LogoRede {
  readonly rede = input.required<RedeSocial>();
  /** Um id por instância: vários logos na mesma página não podem compartilhar o gradiente. */
  protected readonly gradiente = `logo-ig-${++instancias}`;
}

let instancias = 0;
