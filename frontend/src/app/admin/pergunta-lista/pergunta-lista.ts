import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Pergunta } from '../../core/models';
import { PerguntaService } from '../../core/pergunta.service';
import { PerguntaForm } from '../pergunta-form/pergunta-form';

/** Perguntas frequentes no painel: mesmo comportamento dos serviços. */
@Component({
  selector: 'app-pergunta-lista',
  imports: [MatExpansionModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PerguntaForm],
  templateUrl: './pergunta-lista.html',
})
export class PerguntaLista implements OnInit {
  private readonly service = inject(PerguntaService);
  private readonly snack = inject(MatSnackBar);

  protected readonly itens = signal<Pergunta[]>([]);
  protected readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');
  protected readonly criando = signal(false);
  protected readonly editandoId = signal<number | null>(null);

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

  protected aoCriar(p: Pergunta): void {
    this.itens.update((lista) => [...lista, p]);
    this.criando.set(false);
    this.avisar('Pergunta adicionada.');
  }

  protected aoAtualizar(p: Pergunta): void {
    this.itens.update((lista) => lista.map((x) => (x.id === p.id ? p : x)));
    this.editandoId.set(null);
    this.avisar('Pergunta atualizada.');
  }

  protected excluir(p: Pergunta): void {
    if (!confirm(`Excluir a pergunta "${p.pergunta}"?`)) return;
    this.service.excluir(p.id).subscribe({
      next: () => {
        this.itens.update((lista) => lista.filter((x) => x.id !== p.id));
        this.avisar('Pergunta excluída.');
      },
      error: (e: HttpErrorResponse) => this.avisar(`Não foi possível excluir (erro ${e.status}). Tente de novo.`),
    });
  }

  private avisar(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }
}
