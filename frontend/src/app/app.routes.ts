import { Routes } from '@angular/router';
import { Home } from './site/home/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'Metonímia — Produções Acessíveis' },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
  { path: '**', redirectTo: '' },
];
