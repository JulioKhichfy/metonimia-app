import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    // Sem withFetch(): o fetch não informa progresso de upload (barra de envio de fotos/vídeos)
    provideHttpClient(withInterceptors([authInterceptor])),
    // A home chega pronta do build; o Angular "assume" esse HTML em vez de redesenhar a página
    provideClientHydration(withEventReplay()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
