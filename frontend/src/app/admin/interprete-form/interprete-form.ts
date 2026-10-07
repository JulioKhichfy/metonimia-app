import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { format, parseISO } from 'date-fns';
import { formatarCelular, InterpreteService } from '../../core/interprete.service';
import { Interprete } from '../../core/models';
import { FotoInterprete } from '../interprete-lista/foto-interprete';

const LIMITE_FOTO_MB = 5;
const CELULAR = /^\D*(\d\D*){10,13}$/;

@Component({
  selector: 'app-interprete-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    FotoInterprete,
  ],
  templateUrl: './interprete-form.html',
})
export class InterpreteForm implements OnInit {
  private readonly service = inject(InterpreteService);

  /** Quando informado, o formulário edita; caso contrário, cria. */
  readonly interprete = input<Interprete | null>(null);
  readonly salvo = output<Interprete>();
  readonly cancelado = output<void>();

  protected readonly hoje = new Date();
  protected readonly limiteFotoMb = LIMITE_FOTO_MB;

  protected readonly form = inject(FormBuilder).group({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)] }),
    dataNascimento: new FormControl<Date | null>(null, Validators.required),
    endereco: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300), Validators.pattern(/\S/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(200)] }),
    celular: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(CELULAR)] }),
    celularWhatsapp: new FormControl(true, { nonNullable: true }),
  });

  /** Foto nova escolhida (ainda não enviada) e sua pré-visualização. */
  protected readonly fotoNova = signal<File | null>(null);
  protected readonly previa = signal<string | null>(null);
  /** Na edição: o usuário pediu para tirar a foto atual. */
  protected readonly removerFoto = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.trocarPrevia(null));
  }

  ngOnInit(): void {
    const i = this.interprete();
    if (i) {
      this.form.setValue({
        nome: i.nome,
        dataNascimento: parseISO(i.dataNascimento),
        endereco: i.endereco,
        email: i.email ?? '',
        celular: formatarCelular(i.celular),
        celularWhatsapp: i.celularWhatsapp,
      });
    }
  }

  protected escolherFoto(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0] ?? null;
    campo.value = '';
    if (!arquivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
      this.erro.set('A foto deve ser JPG, PNG ou WEBP.');
      return;
    }
    if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
      this.erro.set(`A foto passa do limite de ${LIMITE_FOTO_MB} MB.`);
      return;
    }
    this.erro.set('');
    this.fotoNova.set(arquivo);
    this.removerFoto.set(false);
    this.trocarPrevia(URL.createObjectURL(arquivo));
  }

  protected tirarFoto(): void {
    this.fotoNova.set(null);
    this.trocarPrevia(null);
    if (this.interprete()?.temFoto) this.removerFoto.set(true);
  }

  /** Mostra a foto atual (salva) quando não há foto nova nem pedido de remoção. */
  protected mostraFotoAtual(): boolean {
    return !!this.interprete()?.temFoto && !this.fotoNova() && !this.removerFoto();
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erro.set('Revise os campos destacados.');
      return;
    }
    const v = this.form.getRawValue();
    const dados = {
      nome: v.nome.trim(),
      dataNascimento: format(v.dataNascimento!, 'yyyy-MM-dd'),
      endereco: v.endereco.trim(),
      email: v.email.trim() || null,
      celular: v.celular.trim(),
      celularWhatsapp: v.celularWhatsapp,
      removerFoto: this.removerFoto(),
    };
    this.salvando.set(true);
    this.erro.set('');
    const i = this.interprete();
    const req = i ? this.service.atualizar(i.id, dados, this.fotoNova()) : this.service.criar(dados, this.fotoNova());
    req.subscribe({
      next: (resultado) => {
        this.salvando.set(false);
        this.salvo.emit(resultado);
      },
      error: (e: HttpErrorResponse) => {
        this.salvando.set(false);
        const detalhe = (e.error as { detail?: string } | null)?.detail;
        const motivo = e.status === 0 ? 'sem conexão com o servidor.' : e.status === 413 ? 'foto grande demais.' : (detalhe ?? `erro ${e.status}.`);
        this.erro.set(`Não foi possível salvar: ${motivo}`);
      },
    });
  }

  private trocarPrevia(url: string | null): void {
    const atual = this.previa();
    if (atual) URL.revokeObjectURL(atual);
    this.previa.set(url);
  }
}
