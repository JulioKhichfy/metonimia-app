import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Servico } from '../../core/models';
import { ServicoService } from '../../core/servico.service';
import { ServicoForm } from '../servico-form/servico-form';

/** Lista de serviços no painel: mesmo comportamento de palestras e eventos. */
@Component({
  selector: 'app-servico-lista',
  imports: [MatExpansionModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, ServicoForm],
  templateUrl: './servico-lista.html',
})
export class ServicoLista implements OnInit {
  private readonly service = inject(ServicoService);
  private readonly snack = inject(MatSnackBar);

  protected readonly itens = signal<Servico[]>([]);
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

  protected aoCriar(s: Servico): void {
    this.itens.update((lista) => [...lista, s]);
    this.criando.set(false);
    this.avisar('Serviço adicionado.');
  }

  protected aoAtualizar(s: Servico): void {
    this.itens.update((lista) => lista.map((x) => (x.id === s.id ? s : x)));
    this.editandoId.set(null);
    this.avisar('Serviço atualizado.');
  }

  protected excluir(s: Servico): void {
    if (!confirm(`Excluir o serviço "${s.titulo}"?`)) return;
    this.service.excluir(s.id).subscribe({
      next: () => {
        this.itens.update((lista) => lista.filter((x) => x.id !== s.id));
        this.avisar('Serviço excluído.');
      },
      error: (e: HttpErrorResponse) => this.avisar(`Não foi possível excluir (erro ${e.status}). Tente de novo.`),
    });
  }

  private avisar(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }
}
