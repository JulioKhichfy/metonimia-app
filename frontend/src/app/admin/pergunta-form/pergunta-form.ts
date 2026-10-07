import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Pergunta } from '../../core/models';
import { PerguntaService } from '../../core/pergunta.service';

const LIMITE_PERGUNTA = 300;
const LIMITE_RESPOSTA = 3000;

@Component({
  selector: 'app-pergunta-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <form class="pf" [formGroup]="form" (ngSubmit)="salvar()" novalidate>
      <mat-form-field appearance="outline" class="pf-largo">
        <mat-label>Pergunta</mat-label>
        <input matInput formControlName="pergunta" [maxlength]="limitePergunta" placeholder="Como contratar um intérprete de Libras?" required />
        <mat-hint align="end">{{ form.controls.pergunta.value.length }}/{{ limitePergunta }}</mat-hint>
        <mat-error>Informe a pergunta.</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="pf-largo">
        <mat-label>Resposta</mat-label>
        <textarea matInput formControlName="resposta" rows="6" [maxlength]="limiteResposta" required></textarea>
        <mat-hint>Texto simples. As quebras de linha aparecem no site.</mat-hint>
        <mat-hint align="end">{{ form.controls.resposta.value.length }}/{{ limiteResposta }}</mat-hint>
        <mat-error>Informe a resposta.</mat-error>
      </mat-form-field>

      @if (erro()) {
        <p class="pf-erro" role="alert">{{ erro() }}</p>
      }

      <div class="pf-acoes">
        <button mat-button type="button" (click)="cancelado.emit()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="salvando()">
          {{ salvando() ? 'Salvando…' : 'Salvar pergunta' }}
        </button>
      </div>
    </form>
  `,
})
export class PerguntaForm implements OnInit {
  private readonly service = inject(PerguntaService);

  /** Quando informado, o formulário edita; caso contrário, cria. */
  readonly pergunta = input<Pergunta | null>(null);
  readonly salvo = output<Pergunta>();
  readonly cancelado = output<void>();

  protected readonly limitePergunta = LIMITE_PERGUNTA;
  protected readonly limiteResposta = LIMITE_RESPOSTA;
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    pergunta: ['', [Validators.required, Validators.maxLength(LIMITE_PERGUNTA), Validators.pattern(/\S/)]],
    resposta: ['', [Validators.required, Validators.maxLength(LIMITE_RESPOSTA), Validators.pattern(/\S/)]],
  });

  ngOnInit(): void {
    const p = this.pergunta();
    if (p) this.form.setValue({ pergunta: p.pergunta, resposta: p.resposta });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erro.set('Revise os campos destacados.');
      return;
    }
    const v = this.form.getRawValue();
    const payload = { pergunta: v.pergunta.trim(), resposta: v.resposta.trim() };
    this.salvando.set(true);
    this.erro.set('');
    const p = this.pergunta();
    const req = p ? this.service.atualizar(p.id, payload) : this.service.criar(payload);
    req.subscribe({
      next: (resultado) => {
        this.salvando.set(false);
        this.salvo.emit(resultado);
      },
      error: (e: HttpErrorResponse) => {
        this.salvando.set(false);
        const detalhe = (e.error as { detail?: string } | null)?.detail;
        this.erro.set(`Não foi possível salvar: ${e.status === 0 ? 'sem conexão com o servidor.' : (detalhe ?? `erro ${e.status}.`)}`);
      },
    });
  }
}
