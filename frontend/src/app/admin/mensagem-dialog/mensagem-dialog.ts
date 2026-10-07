import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { InterpreteService } from '../../core/interprete.service';
import { CanalMensagem, Interprete, MensagemResultado } from '../../core/models';

export interface DadosMensagem {
  destinatarios: Interprete[];
  /** true = "enviar para todos" (o servidor usa a lista completa no momento do envio). */
  todos: boolean;
}

const LIMITE_TEXTO = 4000;

/** Popup para escrever e enviar uma mensagem a um ou a todos os intérpretes. */
@Component({
  selector: 'app-mensagem-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './mensagem-dialog.html',
})
export class MensagemDialog {
  private readonly service = inject(InterpreteService);
  private readonly ref = inject(MatDialogRef<MensagemDialog>);
  protected readonly dados = inject<DadosMensagem>(MAT_DIALOG_DATA);

  protected readonly limiteTexto = LIMITE_TEXTO;
  protected readonly comEmail = this.dados.destinatarios.filter((i) => i.email).length;
  protected readonly comWhatsapp = this.dados.destinatarios.filter((i) => i.celularWhatsapp).length;
  protected readonly titulo =
    this.dados.todos
      ? `Mensagem para todos os intérpretes (${this.dados.destinatarios.length})`
      : this.dados.destinatarios.length === 1
        ? `Mensagem para ${this.dados.destinatarios[0].nome}`
        : `Mensagem para ${this.dados.destinatarios.length} intérpretes`;

  protected readonly porEmail = new FormControl(this.comEmail > 0, { nonNullable: true });
  protected readonly porWhatsapp = new FormControl(this.comWhatsapp > 0, { nonNullable: true });
  protected readonly assunto = new FormControl('', { nonNullable: true, validators: Validators.maxLength(150) });
  protected readonly texto = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(LIMITE_TEXTO), Validators.pattern(/\S/)],
  });

  private readonly emailMarcado = toSignal(this.porEmail.valueChanges, { initialValue: this.porEmail.value });
  private readonly whatsappMarcado = toSignal(this.porWhatsapp.valueChanges, { initialValue: this.porWhatsapp.value });
  protected readonly algumCanal = computed(() => this.emailMarcado() || this.whatsappMarcado());
  protected readonly mostrarAssunto = computed(() => this.emailMarcado());

  /** null = ainda verificando. */
  protected readonly emailConfigurado = signal<boolean | null>(null);
  protected readonly enviando = signal(false);
  protected readonly erro = signal('');
  protected readonly resultado = signal<MensagemResultado | null>(null);
  /** Links de WhatsApp já abertos, para marcar na lista. */
  protected readonly abertos = signal<Set<number>>(new Set());

  constructor() {
    if (this.comEmail === 0) this.porEmail.disable();
    if (this.comWhatsapp === 0) this.porWhatsapp.disable();
    this.service.emailConfigurado().subscribe({
      next: (ok) => this.emailConfigurado.set(ok),
      error: () => this.emailConfigurado.set(null),
    });
  }

  protected enviar(): void {
    if (this.texto.invalid || this.assunto.invalid || !this.algumCanal()) {
      this.texto.markAsTouched();
      this.erro.set(this.algumCanal() ? 'Escreva a mensagem.' : 'Escolha e-mail e/ou WhatsApp.');
      return;
    }
    const canais: CanalMensagem[] = [];
    if (this.porEmail.value && this.porEmail.enabled) canais.push('EMAIL');
    if (this.porWhatsapp.value && this.porWhatsapp.enabled) canais.push('WHATSAPP');

    this.enviando.set(true);
    this.erro.set('');
    this.ref.disableClose = true;
    this.service
      .enviarMensagem({
        assunto: this.assunto.value.trim(),
        texto: this.texto.value.trim(),
        canais,
        todos: this.dados.todos,
        interpreteIds: this.dados.todos ? [] : this.dados.destinatarios.map((i) => i.id),
      })
      .subscribe({
        next: (r) => {
          this.enviando.set(false);
          this.ref.disableClose = false;
          this.resultado.set(r);
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.ref.disableClose = false;
          const detalhe = (e.error as { detail?: string } | null)?.detail;
          this.erro.set(`Não foi possível enviar: ${e.status === 0 ? 'sem conexão com o servidor.' : (detalhe ?? `erro ${e.status}.`)}`);
        },
      });
  }

  protected marcarAberto(id: number): void {
    this.abertos.update((s) => new Set(s).add(id));
  }

  protected fechar(): void {
    this.ref.close();
  }
}
