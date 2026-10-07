import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * A home vira HTML pronto no build (index.html): Google e robôs de IA, que muitas vezes não
 * executam JavaScript, leem o conteúdo completo. O painel continua 100% no navegador
 * (index.csr.html). Não há servidor Node em produção: o Caddy só entrega arquivos.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
