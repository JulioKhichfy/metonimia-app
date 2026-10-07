import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Servico } from '../../core/models';
import { ServicoService } from '../../core/servico.service';

export const LIMITE_TITULO = 120;
export const LIMITE_DESCRICAO = 2000;

@Component({
  selector: 'app-servico-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <form class="pf" [formGroup]="form" (ngSubmit)="salvar()" novalidate>
      <mat-form-field appearance="outline" class="pf-largo">
        <mat-label>Título</mat-label>
        <input matInput formControlName="titulo" [maxlength]="limiteTitulo" placeholder="Intérprete de Libras e tradução simultânea" required />
        <mat-hint align="end">{{ form.controls.titulo.value.length }}/{{ limiteTitulo }}</mat-hint>
        <mat-error>Informe o título.</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="pf-largo">
        <mat-label>Descrição</mat-label>
        <textarea matInput formControlName="descricao" rows="6" [maxlength]="limiteDescricao" required></textarea>
        <mat-hint>Texto simples. As quebras de linha aparecem no site.</mat-hint>
        <mat-hint align="end">{{ form.controls.descricao.value.length }}/{{ limiteDescricao }}</mat-hint>
        <mat-error>Informe a descrição.</mat-error>
      </mat-form-field>

      @if (erro()) {
        <p class="pf-erro" role="alert">{{ erro() }}</p>
      }

      <div class="pf-acoes">
        <button mat-button type="button" (click)="cancelado.emit()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="salvando()">
          {{ salvando() ? 'Salvando…' : 'Salvar serviço' }}
        </button>
      </div>
    </form>
  `,
})
export class ServicoForm implements OnInit {
  private readonly service = inject(ServicoService);

  /** Quando informado, o formulário edita; caso contrário, cria. */
  readonly servico = input<Servico | null>(null);
  readonly salvo = output<Servico>();
  readonly cancelado = output<void>();

  protected readonly limiteTitulo = LIMITE_TITULO;
  protected readonly limiteDescricao = LIMITE_DESCRICAO;
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(LIMITE_TITULO), Validators.pattern(/\S/)]],
    descricao: ['', [Validators.required, Validators.maxLength(LIMITE_DESCRICAO), Validators.pattern(/\S/)]],
  });

  ngOnInit(): void {
    const s = this.servico();
    if (s) this.form.setValue({ titulo: s.titulo, descricao: s.descricao });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erro.set('Revise os campos destacados.');
      return;
    }
    const v = this.form.getRawValue();
    const payload = { titulo: v.titulo.trim(), descricao: v.descricao.trim() };
    this.salvando.set(true);
    this.erro.set('');
    const s = this.servico();
    const req = s ? this.service.atualizar(s.id, payload) : this.service.criar(payload);
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
