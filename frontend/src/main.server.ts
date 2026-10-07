import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

registerLocaleData(localePt, 'pt-BR');

/** Usado só no build, para pré-renderizar a home em HTML estático (ver app.routes.server.ts). */
const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;
