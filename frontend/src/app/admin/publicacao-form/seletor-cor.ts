import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { normalizarHex } from '../../core/midia';

export interface Amostra {
  cor: string;
  nome: string;
}

let proximoId = 0;

/**
 * Escolha de cor: amostras prontas, seletor do sistema e campo hexadecimal (#RRGGBB).
 * Com [permitirAutomatica], o valor null significa "automática" e o campo hexadecimal pode ficar vazio.
 */
@Component({
  selector: 'app-seletor-cor',
  imports: [MatFormFieldModule, MatInputModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SeletorCor), multi: true }],
  template: `
    <div class="pf-fundo">
      <span [id]="id + '-rotulo'">{{ rotulo() }}</span>
      <div class="pf-amostras" role="group" [attr.aria-labelledby]="id + '-rotulo'">
        @if (permitirAutomatica()) {
          <button
            type="button"
            class="pf-amostra pf-amostra-auto"
            [class.ativa]="valor() === null"
            [attr.aria-pressed]="valor() === null"
            [disabled]="desabilitado()"
            (click)="escolher(null)"
          >
            Automática
          </button>
        }
        @for (a of amostras(); track a.cor) {
          <button
            type="button"
            class="pf-amostra"
            [style.background]="a.cor"
            [class.ativa]="valor() === a.cor"
            [attr.aria-label]="a.nome"
            [attr.aria-pressed]="valor() === a.cor"
            [disabled]="desabilitado()"
            (click)="escolher(a.cor)"
          ></button>
        }
        <label class="pf-cor-livre">
          <input
            type="color"
            [value]="valor() ?? corAutomatica()"
            [disabled]="desabilitado()"
            (input)="escolher($any($event.target).value)"
            [attr.aria-label]="'Outra cor: ' + rotulo().toLowerCase()"
          />
          Outra cor
        </label>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="pf-hex">
          <mat-label>Hexadecimal</mat-label>
          <input
            matInput
            [value]="texto()"
            [placeholder]="permitirAutomatica() ? 'automática' : '#RRGGBB'"
            [disabled]="desabilitado()"
            maxlength="7"
            spellcheck="false"
            autocomplete="off"
            [attr.aria-invalid]="textoInvalido()"
            (input)="digitar($any($event.target).value)"
            (blur)="aoSair()"
          />
          @if (textoInvalido()) {
            <mat-hint class="pf-hint-erro">Use #RRGGBB, ex.: #A013AD</mat-hint>
          }
        </mat-form-field>
      </div>
    </div>
  `,
})
export class SeletorCor implements ControlValueAccessor {
  readonly rotulo = input.required<string>();
  readonly amostras = input<Amostra[]>([]);
  readonly permitirAutomatica = input(false);
  /** Cor mostrada no seletor do sistema quando o valor é "automática". */
  readonly corAutomatica = input('#111111');

  protected readonly id = `seletor-cor-${++proximoId}`;
  protected readonly valor = signal<string | null>(null);
  protected readonly texto = signal('');
  protected readonly textoInvalido = signal(false);
  protected readonly desabilitado = signal(false);

  private aoMudar: (v: string | null) => void = () => {};
  private aoTocar: () => void = () => {};

  writeValue(v: string | null): void {
    const cor = v ? normalizarHex(v) : null;
    this.valor.set(cor);
    this.texto.set(cor ?? '');
    this.textoInvalido.set(false);
  }

  registerOnChange(fn: (v: string | null) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  protected escolher(cor: string | null): void {
    this.writeValue(cor);
    this.aoMudar(this.valor());
    this.aoTocar();
  }

  /** Aplica a cor assim que o texto digitado forma um hexadecimal válido. */
  protected digitar(texto: string): void {
    this.texto.set(texto);
    if (!texto.trim() && this.permitirAutomatica()) {
      this.valor.set(null);
      this.textoInvalido.set(false);
      this.aoMudar(null);
      return;
    }
    const cor = normalizarHex(texto);
    this.textoInvalido.set(!cor);
    if (cor) {
      this.valor.set(cor);
      this.aoMudar(cor);
    }
  }

  /** Ao sair do campo, mostra a cor normalizada ou desfaz um texto inválido. */
  protected aoSair(): void {
    this.texto.set(this.valor() ?? '');
    this.textoInvalido.set(false);
    this.aoTocar();
  }
}
