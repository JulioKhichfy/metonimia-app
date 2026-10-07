import { MAT_DATE_LOCALE, MatDateFormats } from '@angular/material/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { Routes } from '@angular/router';
import { ptBR } from 'date-fns/locale';
import { authGuard } from '../core/auth.guard';

/** Data no padrão brasileiro (06/10/2026) e hora 24h (19:30). */
const FORMATOS_DATA: MatDateFormats = {
  parse: { dateInput: 'dd/MM/yyyy', timeInput: 'HH:mm' },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'PPPP',
    monthYearA11yLabel: 'MMMM yyyy',
    timeInput: 'HH:mm',
    timeOptionLabel: 'HH:mm',
  },
};

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: MAT_DATE_LOCALE, useValue: ptBR },
      provideDateFnsAdapter(FORMATOS_DATA),
    ],
    children: [
      {
        path: 'login',
        title: 'Entrar | Painel Metonímia',
        loadComponent: () => import('./login/login').then((m) => m.Login),
      },
      {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./shell/shell').then((m) => m.Shell),
        children: [
          {
            path: '',
            title: 'Painel | Metonímia',
            loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
          },
          {
            path: 'palestras',
            title: 'Palestras | Painel Metonímia',
            data: { tipo: 'PALESTRA' },
            loadComponent: () => import('./publicacao-lista/publicacao-lista').then((m) => m.PublicacaoLista),
          },
          {
            path: 'eventos',
            title: 'Eventos | Painel Metonímia',
            data: { tipo: 'EVENTO' },
            loadComponent: () => import('./publicacao-lista/publicacao-lista').then((m) => m.PublicacaoLista),
          },
          {
            path: 'servicos',
            title: 'Serviços | Painel Metonímia',
            loadComponent: () => import('./servico-lista/servico-lista').then((m) => m.ServicoLista),
          },
          {
            path: 'interpretes',
            title: 'Intérpretes | Painel Metonímia',
            loadComponent: () => import('./interprete-lista/interprete-lista').then((m) => m.InterpreteLista),
          },
        ],
      },
    ],
  },
];
