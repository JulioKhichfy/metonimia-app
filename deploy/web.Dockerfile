# Compila o Angular e entrega tudo pelo Caddy (HTTPS automático).
FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# E-mail e WhatsApp do site: vêm do .env via docker-compose (build.args).
# São gravados no código no momento do build (ver frontend/src/app/core/config.ts).
ARG CONTATO_EMAIL=assessoria@metonimia.com.br
ARG CONTATO_WHATSAPP="+55 21 99896-1769"
RUN npx ng build --configuration production \
      --define "CONTATO_EMAIL_DEFINIDO=$(node -p 'JSON.stringify(process.env.CONTATO_EMAIL)')" \
      --define "CONTATO_WHATSAPP_DEFINIDO=$(node -p 'JSON.stringify(process.env.CONTATO_WHATSAPP)')" \
 && node -e " \
      const fs = require('fs'), f = 'dist/frontend/browser/llms.txt', w = process.env.CONTATO_WHATSAPP; \
      fs.writeFileSync(f, fs.readFileSync(f, 'utf8') \
        .replaceAll('{{CONTATO_EMAIL}}', process.env.CONTATO_EMAIL) \
        .replaceAll('{{CONTATO_WHATSAPP}}', w) \
        .replaceAll('{{CONTATO_WHATSAPP_NUMERO}}', w.replace(/\D/g, '')));"

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/frontend/browser /srv
