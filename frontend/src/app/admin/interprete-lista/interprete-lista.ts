import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { formatarCelular, InterpreteService } from '../../core/interprete.service';
import { Interprete } from '../../core/models';
import { InterpreteForm } from '../interprete-form/interprete-form';
import { DadosMensagem, MensagemDialog } from '../mensagem-dialog/mensagem-dialog';
import { FotoInterprete } from './foto-interprete';

/** Cadastro de intérpretes: mesmo comportamento de palestras, eventos e serviços + envio de mensagens. */
@Component({
  selector: 'app-interprete-lista',
  imports: [MatExpansionModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, InterpreteForm, FotoInterprete],
  templateUrl: './interprete-lista.html',
})
export class InterpreteLista implements OnInit {
  private readonly service = inject(InterpreteService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly itens = signal<Interprete[]>([]);
  protected readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');
  protected readonly criando = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly formatarCelular = formatarCelular;

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.estado.set('carregando');
    this.service.listar().subscribe({
      next: (lista) => {
        this.itens.set(lista);
        this.estado.set('ok');
      },
      error: () => this.estado.set('erro'),
    });
  }

  protected aoCriar(i: Interprete): void {
    this.itens.update((lista) => ordenar([...lista, i]));
    this.criando.set(false);
    this.avisar('Intérprete cadastrado.');
  }

  protected aoAtualizar(i: Interprete): void {
    this.itens.update((lista) => ordenar(lista.map((x) => (x.id === i.id ? i : x))));
    this.editandoId.set(null);
    this.avisar('Intérprete atualizado.');
  }

  protected excluir(i: Interprete): void {
    if (!confirm(`Excluir o cadastro de ${i.nome}? A foto também será apagada.`)) return;
    this.service.excluir(i.id).subscribe({
      next: () => {
        this.itens.update((lista) => lista.filter((x) => x.id !== i.id));
        this.avisar('Cadastro excluído.');
      },
      error: (e: HttpErrorResponse) => this.avisar(`Não foi possível excluir (erro ${e.status}). Tente de novo.`),
    });
  }

  protected mensagemParaTodos(): void {
    this.abrirMensagem({ destinatarios: this.itens(), todos: true });
  }

  protected mensagemPara(i: Interprete): void {
    this.abrirMensagem({ destinatarios: [i], todos: false });
  }

  protected idade(i: Interprete): number {
    const [a, m, d] = i.dataNascimento.split('-').map(Number);
    const hoje = new Date();
    return hoje.getFullYear() - a - (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d) ? 1 : 0);
  }

  protected dataBr(iso: string): string {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  private abrirMensagem(dados: DadosMensagem): void {
    this.dialog.open(MensagemDialog, { data: dados, width: '640px', maxWidth: '95vw', autoFocus: 'dialog' });
  }

  private avisar(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }
}

function ordenar(lista: Interprete[]): Interprete[] {
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
