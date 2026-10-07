# Infraestrutura da Metonímia — guia de deploy em VPS

Este guia explica **como o projeto está montado para rodar numa VPS Linux**, o que **cada linha**
dos arquivos de infraestrutura faz, e traz uma colinha de **SSH**, **Linux** e **Docker** para o dia a dia.

Sumário:

1. [Visão geral: o que roda onde](#1-visão-geral-o-que-roda-onde)
2. [Mapa dos arquivos de infra](#2-mapa-dos-arquivos-de-infra)
3. [Linha a linha](#3-linha-a-linha)
   - [docker-compose.yml](#31-docker-composeyml)
   - [backend/Dockerfile](#32-backenddockerfile)
   - [deploy/web.Dockerfile](#33-deploywebdockerfile)
   - [deploy/Caddyfile](#34-deploycaddyfile)
   - [.env / .env.example](#35-env--envexample)
   - [application-prod.yml](#36-backendsrcmainresourcesapplication-prodyml)
   - [deploy/preparar-servidor.sh](#37-deploypreparar-servidorsh)
   - [deploy/atualizar.sh](#38-deployatualizarsh)
   - [deploy/backup.sh](#39-deploybackupsh)
   - [.gitignore e .dockerignore](#310-gitignore-e-dockerignore)
4. [Passo a passo: do aluguel da VPS ao site no ar](#4-passo-a-passo-do-aluguel-da-vps-ao-site-no-ar)
5. [SSH, SCP e companhia](#5-ssh-scp-e-companhia)
6. [Linux: comandos que você vai usar no servidor](#6-linux-comandos-que-você-vai-usar-no-servidor)
7. [Docker: conceitos e comandos](#7-docker-conceitos-e-comandos)
8. [Rotinas de operação](#8-rotinas-de-operação)
9. [Problemas comuns](#9-problemas-comuns)

---

## 1. Visão geral: o que roda onde

Na VPS **não instalamos Java, Node nem PostgreSQL**. Só instalamos o **Docker**, e tudo roda em
3 containers descritos no `docker-compose.yml`:

```
                 Internet (portas 80 e 443)
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│ VPS Linux (Ubuntu 24.04)                                      │
│                                                               │
│  ┌───────────────────────────┐                                │
│  │ web  (Caddy)              │  ← único container exposto     │
│  │ • HTTPS automático        │                                │
│  │ • entrega o site Angular  │                                │
│  │ • entrega /uploads/*      │──── lê ────┐                   │
│  └──────────┬────────────────┘            │                   │
│             │ /api/*  →  api:8080         │                   │
│             ▼                             ▼                   │
│  ┌───────────────────────────┐   [volume uploads]             │
│  │ api  (Spring Boot, Java)  │── grava ──┘                    │
│  └──────────┬────────────────┘                                │
│             │ JDBC → db:5432                                  │
│             ▼                                                 │
│  ┌───────────────────────────┐                                │
│  │ db   (PostgreSQL 17)      │── grava ── [volume pgdata]     │
│  └───────────────────────────┘                                │
│                                                               │
│  [volume caddy_data] = certificados HTTPS                     │
└───────────────────────────────────────────────────────────────┘
```

Ideias principais:

- **Só o Caddy (`web`) fica exposto para fora**, nas portas 80 e 443. A API (8080) e o banco (5432)
  só são vistos **dentro da rede interna do Docker**, onde os containers se acham pelo nome
  (`api`, `db`). Ninguém na internet consegue falar direto com o banco.
- **Container é descartável, volume não.** Os containers podem ser apagados e recriados à vontade
  (é o que acontece a cada atualização). Os dados que importam ficam nos **volumes**:
  `pgdata` (banco), `uploads` (fotos e vídeos) e `caddy_data` (certificados).
- **O build acontece no próprio servidor.** O `docker compose up --build` compila o Angular e o
  Spring Boot dentro de containers temporários. Por isso a VPS precisa de RAM (4 GB é o ideal; com
  menos, o script cria swap).
- **Segredos ficam no `.env`**, que fica só no servidor e nunca vai para o GitHub.

---

## 2. Mapa dos arquivos de infra

| Arquivo | Papel |
|---|---|
| `docker-compose.yml` | Define os 3 serviços (`db`, `api`, `web`), volumes, variáveis e dependências. É o "maestro". |
| `backend/Dockerfile` | Receita da imagem da API: compila com Maven e roda o `.jar` com Java 21. |
| `deploy/web.Dockerfile` | Receita da imagem do site: compila o Angular e coloca o resultado dentro do Caddy. |
| `deploy/Caddyfile` | Configuração do Caddy: HTTPS, roteamento `/api` → API, `/uploads`, SPA, cabeçalhos de segurança. |
| `.env.example` | Modelo das variáveis secretas. O `.env` real é gerado no servidor. |
| `backend/src/main/resources/application-prod.yml` | Configuração do Spring no perfil `prod` (PostgreSQL). |
| `deploy/preparar-servidor.sh` | Roda **uma vez** numa VPS nova: instala tudo e sobe o site. |
| `deploy/atualizar.sh` | Roda **a cada nova versão**: `git pull` + rebuild. |
| `deploy/backup.sh` | Backup do banco e das mídias (agendado diariamente às 3h). |
| `backend/src/main/resources/db/migration/*.sql` | Migrações do Flyway: criam e alteram as tabelas ao subir a API. |

No servidor, o projeto fica em **`/opt/metonimia-app`**. Todos os comandos `docker compose`
devem ser rodados **dentro dessa pasta**, onde estão o `docker-compose.yml` e o `.env`.

---

## 3. Linha a linha

### 3.1 `docker-compose.yml`

```yaml
# Produção: docker compose up -d --build
services:                                   # lista de containers que o Compose gerencia
  db:                                       # serviço 1: banco. "db" também vira o hostname na rede interna
    image: postgres:17-alpine               # usa uma imagem pronta do Docker Hub (Postgres 17, base Alpine = pequena)
    restart: unless-stopped                 # se cair ou a VPS reiniciar, sobe sozinho (a não ser que você pare com "stop")
    environment:                            # variáveis de ambiente passadas ao container
      POSTGRES_DB: metonimia                # na 1ª inicialização, cria o banco "metonimia"
      POSTGRES_USER: ${DB_USERNAME}         # ${...} = valor vem do arquivo .env (mesma pasta do compose)
      POSTGRES_PASSWORD: ${DB_PASSWORD}     # senha do usuário acima
    volumes:
      - pgdata:/var/lib/postgresql/data     # volume "pgdata" montado onde o Postgres guarda os dados → sobrevive a recriações
    healthcheck:                            # como o Docker sabe se o banco está "saudável"
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d metonimia"]   # comando que responde OK quando o Postgres aceita conexões
      interval: 10s                         # testa a cada 10 s
      timeout: 5s                           # se o teste demorar mais que 5 s, conta como falha
      retries: 10                           # 10 falhas seguidas = "unhealthy"

  api:                                      # serviço 2: Spring Boot
    build: ./backend                        # não baixa imagem: CONSTRÓI a partir de backend/Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy          # só inicia a API depois que o healthcheck do banco passar
    environment:
      SPRING_PROFILES_ACTIVE: prod          # ativa application-prod.yml (PostgreSQL em vez de H2)
      DB_URL: jdbc:postgresql://db:5432/metonimia   # "db" = nome do serviço acima; o DNS interno do Docker resolve
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      APP_JWT_SECRET: ${APP_JWT_SECRET}     # chave que assina os tokens de login do painel
      ADMIN_USERNAME: ${ADMIN_USERNAME}     # admin criado na 1ª inicialização (AdminSeeder)
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      APP_UPLOAD_DIR: /data/uploads         # pasta, dentro do container, onde a API grava fotos/vídeos
      APP_PRIVADO_DIR: /data/privado        # fotos de intérpretes (dados pessoais): NÃO é montada no Caddy
      MAIL_HOST: ${MAIL_HOST:-}             # servidor SMTP; vazio = envio de e-mail desligado
      MAIL_PORT: ${MAIL_PORT:-587}          # 587 = SMTP com STARTTLS (padrão da maioria dos provedores)
      MAIL_USERNAME: ${MAIL_USERNAME:-}     # login do e-mail
      MAIL_PASSWORD: ${MAIL_PASSWORD:-}     # senha (no Gmail/Workspace: "senha de app")
      MAIL_REMETENTE: ${MAIL_REMETENTE:-assessoria@metonimia.com.br}         # quem aparece como remetente
      MENSAGEM_COPIA_EMAIL: ${MENSAGEM_COPIA_EMAIL:-assessoria@metonimia.com.br}   # recebe cópia de toda mensagem
    volumes:
      - uploads:/data/uploads               # essa pasta é o volume "uploads" → arquivos persistem
      - privado:/data/privado               # volume "privado": só a API enxerga (o Caddy não)
                                            # (repare: SEM "ports:" → a porta 8080 não é exposta para fora)

  web:                                      # serviço 3: Caddy (site + HTTPS + proxy)
    build:
      context: .                            # contexto = raiz do repositório (precisa ver frontend/ e deploy/)
      dockerfile: deploy/web.Dockerfile     # receita fica em deploy/
      args:                                 # "argumentos de build": valores passados para o Dockerfile (ARG)
        CONTATO_EMAIL: ${CONTATO_EMAIL:-assessoria@metonimia.com.br}   # ${VAR:-padrão} = do .env, ou o padrão se faltar
        CONTATO_WHATSAPP: ${CONTATO_WHATSAPP:-+55 21 99896-1769}       # gravados no site NO BUILD → mudou? rebuild do web
    restart: unless-stopped
    depends_on:
      - api                                 # sobe depois da API (só ordem de início, não espera ela ficar pronta)
    ports:                                  # ÚNICAS portas abertas para a internet  "porta_da_VPS:porta_do_container"
      - "80:80"                             # HTTP (o Caddy redireciona para HTTPS e usa para validar o certificado)
      - "443:443"                           # HTTPS
      - "443:443/udp"                       # HTTP/3 (QUIC), mais rápido em celular
    environment:
      DOMAIN: ${DOMAIN}                     # lido pelo Caddyfile como {$DOMAIN}
      REDIRECT_DOMAINS: ${REDIRECT_DOMAINS}
    volumes:
      - uploads:/srv-uploads:ro             # o MESMO volume de uploads, só leitura (:ro) → Caddy entrega os arquivos direto
      - caddy_data:/data                    # certificados HTTPS (não apague: o Let's Encrypt limita reemissões)
      - caddy_config:/config                # configuração interna do Caddy

volumes:                                    # declara os volumes nomeados. O Docker cria na 1ª vez.
  pgdata:                                   # nome real no disco: metonimia-app_pgdata (prefixo = nome da pasta do projeto)
  uploads:                                  # metonimia-app_uploads
  privado:                                  # metonimia-app_privado (fotos de intérpretes)
  caddy_data:
  caddy_config:
```

> **Nome do projeto:** o Compose usa o nome da pasta (`metonimia-app`) como prefixo de volumes,
> redes e containers. Por isso o `backup.sh` cita `metonimia-app_uploads`. Se mudar a pasta de
> lugar com outro nome, os volumes "somem" (na verdade ficam órfãos com o nome antigo).

### 3.2 `backend/Dockerfile`

É um build em **dois estágios** (*multi-stage*): o primeiro tem Maven + JDK (pesado) e só serve
para compilar; o segundo tem só o JRE (leve) e o `.jar`. A imagem final não carrega Maven nem código-fonte.

```dockerfile
# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build   # imagem com Maven e JDK 21; "AS build" dá um nome a este estágio
WORKDIR /app                                  # cria /app e passa a trabalhar nela (como um "cd")
COPY pom.xml .                                # copia SÓ o pom.xml primeiro...
RUN mvn -B -q dependency:go-offline           # ...e baixa as dependências. -B = modo não interativo, -q = silencioso.
                                              # Truque de cache: enquanto o pom.xml não mudar, o Docker reaproveita
                                              # esta camada e não baixa tudo de novo a cada build.
COPY src src                                  # agora copia o código-fonte
RUN mvn -B -q package -DskipTests             # compila e gera target/*.jar (sem rodar testes, para o build ser rápido)

# ---- runtime ----
FROM eclipse-temurin:21-jre-alpine            # novo estágio, do zero: só o Java 21 (JRE) sobre Alpine Linux
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/uploads && chown -R app:app /data
                                              # cria um usuário de sistema "app" (sem senha, sem login),
                                              # cria a pasta de uploads e dá a posse dela ao usuário "app"
COPY --from=build /app/target/*.jar app.jar   # traz SÓ o .jar do estágio "build"
USER app                                      # daqui em diante roda como "app", não como root (segurança)
EXPOSE 8080                                   # documenta a porta. NÃO publica nada; quem publica é o "ports:" do compose
ENV SPRING_PROFILES_ACTIVE=prod \
    APP_UPLOAD_DIR=/data/uploads              # valores padrão (o compose pode sobrescrever)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60", "-jar", "/app/app.jar"]
                                              # comando que roda quando o container inicia.
                                              # MaxRAMPercentage=60: o Java usa no máximo 60% da memória disponível
                                              # (sobra para o Postgres e o sistema)
```

### 3.3 `deploy/web.Dockerfile`

Mesma ideia: estágio 1 compila o Angular com Node; estágio 2 é o Caddy com os arquivos estáticos.

```dockerfile
# Compila o Angular e entrega tudo pelo Caddy (HTTPS automático).
FROM node:24-alpine AS build                                   # Node 24 só para compilar
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./       # primeiro só os manifests (mesmo truque de cache do Maven)
RUN npm ci                                                     # instala EXATAMENTE as versões do package-lock.json (reprodutível)
COPY frontend/ ./                                              # copia o código do frontend
ARG CONTATO_EMAIL=assessoria@metonimia.com.br                  # ARG = variável que só existe durante o build;
ARG CONTATO_WHATSAPP="+55 21 99896-1769"                       # o valor vem do "args:" do compose (que lê o .env)
RUN npx ng build --configuration production \                  # gera HTML/JS/CSS otimizados em dist/frontend/browser.
      --define "CONTATO_EMAIL_DEFINIDO=$(node -p '...')" \      # --define troca CONTATO_EMAIL_DEFINIDO no código pelo valor
      --define "CONTATO_WHATSAPP_DEFINIDO=$(node -p '...')" \   # (o node -p JSON.stringify põe as aspas certinhas)
 && node -e "...replaceAll('{{CONTATO_EMAIL}}', ...)..."       # preenche os marcadores {{...}} do llms.txt
                                                               # A home é PRÉ-RENDERIZADA aqui: o index.html já sai com
                                                               # o texto completo (para Google e IAs). O painel usa index.csr.html.
                                                               # robots.txt, sitemap.xml e llms.txt vêm de frontend/public/

FROM caddy:2-alpine                                            # imagem oficial do Caddy 2
COPY deploy/Caddyfile /etc/caddy/Caddyfile                     # coloca nossa configuração onde o Caddy procura por padrão
COPY --from=build /app/dist/frontend/browser /srv              # site compilado vai para /srv (raiz servida no Caddyfile)
                                                               # (sem CMD: a imagem do Caddy já sabe iniciar com /etc/caddy/Caddyfile)
```

### 3.4 `deploy/Caddyfile`

O **Caddy** é o servidor web. Ele faz três coisas: obtém e renova o **certificado HTTPS sozinho**
(Let's Encrypt), entrega o **site Angular** e funciona como **proxy reverso** para a API.

```caddyfile
# DOMAIN e REDIRECT_DOMAINS vêm do arquivo .env (ver .env.example).
# Use a forma "xn--" (punycode) do domínio com acento.

{$DOMAIN} {                              # bloco do site. {$DOMAIN} = variável de ambiente (ex.: xn--metonmia-g2a.com.br).
                                         # Só de escrever um domínio aqui, o Caddy ativa HTTPS automático
                                         # e redireciona http:// → https://
	encode zstd gzip                     # comprime as respostas (zstd se o navegador aceitar, senão gzip)

	# API (Spring Boot)
	handle /api/* {                      # requisições que começam com /api/ ...
		reverse_proxy api:8080           # ...são repassadas ao container "api" na porta 8080 (rede interna)
	}

	# Fotos e vídeos enviados pelo painel, direto do disco
	handle_path /uploads/* {             # como handle, mas REMOVE o prefixo: /uploads/a.jpg vira /a.jpg
		root * /srv-uploads              # pasta onde está montado o volume de uploads (só leitura)
		header Cache-Control "public, max-age=2592000, immutable"   # navegador pode guardar por 30 dias
		file_server                      # entrega o arquivo do disco (bem mais eficiente que passar pelo Java)
	}

	# Site Angular. A home (/) é o index.html pré-renderizado no build (conteúdo legível por
	# buscadores e IAs). Rotas só do navegador, como /admin/palestras, recebem o index.csr.html.
	handle {                             # sem caminho = "todo o resto" (o Caddy testa os handles mais específicos antes)
		root * /srv                      # raiz = site compilado
		# .js/.css do Angular têm hash no nome: podem ficar em cache por 1 ano
		@versionados path *.js *.css *.woff2                                   # "@nome" cria um matcher (um filtro)
		header @versionados Cache-Control "public, max-age=31536000, immutable"   # cache longo só para esses
		@demais not path *.js *.css *.woff2
		header @demais Cache-Control "no-cache"                               # HTML sempre revalida → versão nova aparece na hora
		@painel path /admin /admin/*
		header @painel X-Robots-Tag "noindex, nofollow"                       # pede ao Google para não indexar o painel
		try_files {path} /index.csr.html # se o arquivo existe, entrega ("/" é pasta → entrega o index.html pré-renderizado);
		                                 # senão entrega index.csr.html, a "casca" vazia que o Angular preenche no navegador
		                                 # (é isso que faz /admin/palestras funcionar ao recarregar a página)
		file_server
	}

	header {                             # cabeçalhos de segurança em todas as respostas
		Strict-Transport-Security "max-age=31536000"   # HSTS: navegador só usa HTTPS neste domínio por 1 ano
		X-Content-Type-Options "nosniff"               # navegador não "adivinha" tipo de arquivo
		Referrer-Policy "strict-origin-when-cross-origin"   # limita o que vaza no cabeçalho Referer
		-Server                                        # o "-" REMOVE o cabeçalho Server (não anuncia o software)
	}
}

# www e domínios alternativos (ex.: metonimia.com.br sem acento) redirecionam para o principal
{$REDIRECT_DOMAINS} {                    # lista de domínios separados por ", " (também ganham HTTPS)
	redir https://{$DOMAIN}{uri} permanent   # redireciona 301 para o domínio principal mantendo o caminho ({uri})
}
```

### 3.5 `.env` / `.env.example`

O `.env` fica em `/opt/metonimia-app/.env`, com permissão `600` (só o root lê). O Docker Compose
lê esse arquivo **automaticamente** e substitui os `${...}` do `docker-compose.yml`.

```bash
DOMAIN=xn--metonmia-g2a.com.br            # domínio principal em punycode (metonímia.com.br)
REDIRECT_DOMAINS=www.xn--metonmia-g2a.com.br   # domínios que só redirecionam para o principal
CONTATO_EMAIL=assessoria@metonimia.com.br # e-mail exibido no site e destino do formulário (FormSubmit)
CONTATO_WHATSAPP="+55 21 99896-1769"      # WhatsApp do site; aspas por causa dos espaços
MAIL_HOST=                                # SMTP para mensagens aos intérpretes (vazio = desligado)
MAIL_PORT=587                             #   ex.: Google Workspace smtp.gmail.com · Zoho smtp.zoho.com
MAIL_USERNAME=assessoria@metonimia.com.br
MAIL_PASSWORD=                            #   no Gmail/Workspace use uma "senha de app"
MAIL_REMETENTE=assessoria@metonimia.com.br
MENSAGEM_COPIA_EMAIL=assessoria@metonimia.com.br   # recebe cópia de toda mensagem enviada
DB_USERNAME=metonimia                     # usuário do Postgres
DB_PASSWORD=...                           # senha do Postgres (gerada aleatória pelo script)
APP_JWT_SECRET=...                        # chave dos tokens de login (≥ 32 caracteres). Trocar = desloga todo mundo.
ADMIN_USERNAME=admin                      # login do painel
ADMIN_PASSWORD='...'                      # senha do painel (só vale na 1ª criação do admin; ver seção 8)
```

> Mudou o `.env`? Rode `docker compose up -d`: o Compose percebe e recria só os containers afetados.
> **Exceção:** `CONTATO_EMAIL` e `CONTATO_WHATSAPP` são gravados no site durante o build. Para eles,
> rode `docker compose up -d --build web` (ou `./deploy/atualizar.sh`).
> Trocou o e-mail? Refaça a ativação do FormSubmit (ver `README.md`).
> **Atenção:** `DB_PASSWORD` só é aplicada pelo Postgres na **primeira** inicialização (quando o
> volume está vazio). Trocar depois exige alterar a senha dentro do banco também.

### 3.6 `backend/src/main/resources/application-prod.yml`

```yaml
spring:
  datasource:
    url: ${DB_URL}              # jdbc:postgresql://db:5432/metonimia (vem do compose)
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
logging:
  level:
    root: INFO                  # nível de log em produção (DEBUG seria barulhento demais)
```

Ao subir, o **Flyway** executa as migrações de `db/migration/` que ainda não rodaram
(`V1__esquema_inicial.sql`, `V2__cor_texto_e_redes.sql`...). A tabela `flyway_schema_history`
guarda quais já foram aplicadas. **Nunca edite uma migração que já rodou em produção**; crie uma `V3__...`.

### 3.7 `deploy/preparar-servidor.sh`

Roda **uma vez** numa VPS nova, como root. Pode ser executado de novo sem estragar nada (é *idempotente*).

#### Cabeçalho e configurações

```bash
#!/usr/bin/env bash             # "shebang": diz ao sistema para executar com o bash
set -euo pipefail               # -e: para no primeiro erro
                                # -u: erro se usar variável não definida
                                # -o pipefail: num "a | b", falha se QUALQUER parte falhar (não só a última)

REPO_URL="${REPO_URL:-https://github.com/JulioKhichfy/metonimia-app.git}"
                                # ${VAR:-padrão} = usa $REPO_URL se existir, senão o valor padrão.
                                # Permite: REPO_URL=outro bash preparar-servidor.sh
DIR="${DIR:-/opt/metonimia-app}"   # onde o projeto será clonado
DOMINIO_PADRAO="metonímia.com.br"

verde() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }   # função que imprime em verde (\033[...m = códigos de cor ANSI)
aviso() { printf '\033[1;33m[aviso] %s\033[0m\n' "$*"; } # amarelo
erro()  { printf '\033[1;31m[erro] %s\033[0m\n' "$*" >&2; exit 1; }   # vermelho, na saída de erro (>&2), e encerra

[ "$(id -u)" -eq 0 ] || erro "Rode como root (ou: sudo bash $0)."
                                # id -u = número do usuário; root é 0. "A || B" = se A falhar, executa B
grep -qi ubuntu /etc/os-release || aviso "Script testado para Ubuntu; ..."
                                # -q silencioso, -i ignora maiúsculas. Só avisa, não para.

export DEBIAN_FRONTEND=noninteractive   # faz o apt não abrir telas de pergunta durante a instalação
```

#### 1/9 — Sistema e ferramentas

```bash
apt-get update -y               # atualiza a LISTA de pacotes disponíveis (não instala nada)
apt-get upgrade -y              # atualiza os pacotes instalados. -y = responde "sim" automaticamente
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades openssl python3 cron
                                # ca-certificates: certificados para HTTPS | curl: baixar URLs | git
                                # ufw: firewall simples | fail2ban: bane IPs que erram a senha do SSH várias vezes
                                # unattended-upgrades: instala atualizações de segurança sozinho
                                # openssl: gerar senhas aleatórias | python3: converter domínio para punycode
                                # cron: agendador de tarefas (backup diário)
dpkg-reconfigure -f noninteractive unattended-upgrades   # ativa as atualizações automáticas
systemctl enable --now fail2ban cron   # enable = iniciar no boot; --now = e iniciar agora
```

#### 2/9 — Swap

Swap é uma "memória extra" no disco. Mais lenta que a RAM, mas evita que o build do Angular/Maven
seja morto por falta de memória em VPS pequenas.

```bash
RAM_MB=$(free -m | awk '/^Mem:/ {print $2}')    # free -m mostra a memória em MB; o awk pega a coluna "total"
if [ "$RAM_MB" -lt 3800 ] && ! swapon --show | grep -q .; then   # menos de ~4 GB E nenhum swap ativo?
  fallocate -l 2G /swapfile     # cria um arquivo de 2 GB
  chmod 600 /swapfile           # só o root pode ler (o swap pode conter dados sensíveis da memória)
  mkswap /swapfile              # formata o arquivo como área de swap
  swapon /swapfile              # ativa agora
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
                                # /etc/fstab = o que montar no boot. Adiciona a linha só se ainda não existir
fi
```

#### 3/9 — Docker

```bash
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
                                # command -v = "esse comando existe?". >/dev/null 2>&1 = descarta saída e erros
  echo "Docker já instalado: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh   # script oficial da Docker que instala Docker Engine + plugin Compose
                                # -f falha em erro HTTP, -s silencioso, -S mostra erros, -L segue redirecionamentos
fi
systemctl enable --now docker   # Docker sobe no boot (e com ele os containers com "restart: unless-stopped")
```

#### 4/9 — Firewall (UFW)

```bash
ufw allow OpenSSH               # libera a porta 22 ANTES de ligar o firewall (senão você se tranca para fora!)
ufw allow 80/tcp                # HTTP
ufw allow 443/tcp               # HTTPS
ufw allow 443/udp               # HTTP/3
ufw --force enable              # liga o firewall sem perguntar; o resto das portas fica bloqueado
ufw status                      # mostra as regras
```

> ⚠️ O Docker publica portas mexendo direto no iptables e **passa por cima do UFW**. Por isso a regra
> de ouro do projeto é: **só o `web` tem `ports:`**. Nunca adicione `ports: - "5432:5432"` no `db`.
> Se precisar, use `"127.0.0.1:5432:5432"` (só a própria VPS enxerga) e acesse por túnel SSH (seção 5).

#### 5/9 — Código

```bash
if [ -d "$DIR/.git" ]; then     # -d = "existe essa pasta?". Já clonado → só atualiza
  git -C "$DIR" pull --ff-only  # -C = roda o git naquela pasta. --ff-only = só aceita avançar (não cria merge)
else
  git clone "$REPO_URL" "$DIR"  # repositório privado pede usuário + Personal Access Token do GitHub
fi
cd "$DIR"
chmod +x deploy/*.sh            # dá permissão de execução aos scripts
```

#### 6/9 — `.env`

```bash
if [ -f .env ]; then            # -f = "existe esse arquivo?". Se já existe, NÃO sobrescreve (preserva senhas)
  DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"')
                                # pega a linha DOMAIN=..., corta tudo após o 1º "=", remove aspas
else
  read -rp "Domínio principal [$DOMINIO_PADRAO]: " DOMINIO_DIGITADO   # read -p = pergunta e lê do teclado
  DOMINIO_DIGITADO="${DOMINIO_DIGITADO:-$DOMINIO_PADRAO}"            # Enter vazio = padrão
  DOMAIN=$(python3 -c "...encode('idna')..." "$DOMINIO_DIGITADO")    # metonímia.com.br → xn--metonmia-g2a.com.br
  ...
  read -rsp "Senha do painel ...: " ADMIN_PASSWORD; echo   # -s = não mostra o que é digitado
  ...                                                       # Enter vazio → gera com openssl rand
  DB_PASSWORD=$(openssl rand -hex 24)                       # 48 caracteres hexadecimais aleatórios
  APP_JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')    # 64 caracteres aleatórios, sem quebra de linha

  umask 077                     # arquivos criados a partir daqui nascem com permissão 600 (só o dono lê/escreve)
  cat > .env <<EOF              # "heredoc": tudo até a linha EOF vai para o arquivo .env (com as $variáveis expandidas)
DOMAIN=$DOMAIN
...
EOF
  umask 022                     # volta ao padrão
fi
```

#### 7/9 — DNS

```bash
IP_SERVIDOR=$(curl -4 -fsS --max-time 10 https://api.ipify.org || echo "?")   # pergunta a um serviço externo "qual meu IP público?"
IP_DOMINIO=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)   # resolve o domínio (IPv4)
if [ "$IP_SERVIDOR" != "$IP_DOMINIO" ]; then aviso "..."; fi   # só avisa: o site sobe e o HTTPS sai quando o DNS propagar
```

#### 8/9 — Subir os containers

```bash
docker compose up -d --build    # constrói as imagens e sobe tudo em segundo plano (-d = detached)
for _ in $(seq 1 60); do        # tenta até 60 vezes (60 × 5 s = 5 min)
  if docker compose logs api 2>/dev/null | grep "Started MetonimiaApplication" >/dev/null; then
    echo "API no ar."; break    # achou a mensagem de "iniciado" no log do Spring → sai do loop
  fi
  sleep 5
done
docker compose ps               # mostra o estado dos containers
```

#### 9/9 — Backup agendado (cron)

```bash
LINHA_CRON="0 3 * * * cd $DIR && ./deploy/backup.sh >> /var/log/metonimia-backup.log 2>&1"
                                # formato cron: minuto hora dia-do-mês mês dia-da-semana
                                # "0 3 * * *" = todo dia às 03:00
                                # >> anexa a saída no log; 2>&1 manda os erros para o mesmo lugar
( crontab -l 2>/dev/null | grep -v 'metonimia.*backup.sh' || true; echo "$LINHA_CRON" ) | crontab -
                                # lê o crontab atual, remove a linha antiga do backup (se houver),
                                # acrescenta a nova e grava tudo de volta → nunca duplica
crontab -l | grep backup.sh     # confirma
```

### 3.8 `deploy/atualizar.sh`

```bash
#!/usr/bin/env sh
set -e                          # para no primeiro erro
cd "$(dirname "$0")/.."         # $0 = caminho do script; dirname = pasta dele (deploy/); /.. = raiz do projeto.
                                # Assim funciona de qualquer pasta onde você estiver
git pull --ff-only              # baixa a versão nova do GitHub (falha se houver alteração local conflitante)
docker compose up -d --build    # reconstrói as imagens que mudaram e recria só os containers afetados.
                                # O banco (imagem pronta) normalmente não é tocado.
docker image prune -f           # apaga imagens antigas "penduradas" (<none>) que sobraram do build → libera disco
docker compose ps               # mostra se tudo ficou "Up"
```

> Durante o `up --build`, o site fica fora do ar alguns segundos enquanto os containers são trocados.

### 3.9 `deploy/backup.sh`

```bash
#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
mkdir -p backups                # cria a pasta (sem erro se já existir: -p)
chmod 700 backups               # só o root entra na pasta: os backups têm dados pessoais dos intérpretes
DATA=$(date +%Y-%m-%d)          # ex.: 2026-10-07
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" metonimia' | gzip > "backups/banco-$DATA.sql.gz"
                                # exec = roda um comando DENTRO do container db já em execução
                                # -T = sem terminal interativo (obrigatório quando a saída vai para um pipe "|")
                                # pg_dump gera o SQL completo do banco; gzip comprime; > grava no arquivo
                                # as aspas simples fazem $POSTGRES_USER ser lido DENTRO do container
docker run --rm -v metonimia-app_uploads:/u:ro -v "$PWD/backups":/b alpine tar czf "/b/uploads-$DATA.tar.gz" -C /u .
                                # sobe um container Alpine temporário (--rm = apaga ao terminar) com:
                                #   o volume de uploads montado em /u (só leitura)
                                #   a pasta backups/ da VPS montada em /b
                                # e compacta (tar czf) todo o conteúdo de /u para /b/uploads-DATA.tar.gz
docker run --rm -v metonimia-app_privado:/p:ro -v "$PWD/backups":/b alpine sh -c "tar czf ... && chmod 600 ..."
                                # mesma coisa para as fotos dos intérpretes; chmod 600 = só o root lê o arquivo
find backups -type f -mtime +14 -delete   # apaga backups com mais de 14 dias
echo "Backup salvo em backups/ ($DATA)"
```

> O botão **BACKUP** do painel (`/admin`) é um complemento: baixa só os dados de palestras e
> eventos em `.sql` direto para o seu computador. O `backup.sh` é o backup **completo** (banco
> inteiro + fotos e vídeos), mas fica **na própria VPS**. Se a VPS sumir, ele some junto.
> Copie a pasta `backups/` para fora regularmente (seção 5, `scp`).

### 3.10 `.gitignore` e `.dockerignore`

- `.gitignore` impede que `.env`, `backups/`, `node_modules/`, `target/`, `backend/data/` (H2 local) e
  `backend/uploads/` subam para o GitHub.
- `backend/.dockerignore` impede que `target`, `data`, `uploads` e arquivos da IDE sejam enviados
  para o build da imagem (deixa o build mais rápido e evita levar lixo local para dentro da imagem).
- O build do `web` usa a raiz do repositório como contexto e não há `.dockerignore` na raiz. Na VPS
  isso não importa (o clone não tem `node_modules`). Mas, se um dia você rodar
  `docker compose build` **no Windows**, crie um `.dockerignore` na raiz com
  `frontend/node_modules`, `frontend/dist`, `frontend/.angular`, `backend/target`.

---

## 4. Passo a passo: do aluguel da VPS ao site no ar

### 4.1 Escolhendo a VPS

- **Sistema:** Ubuntu 24.04 LTS (é para ele que o script foi feito).
- **RAM:** 4 GB recomendados (o build roda no servidor). 2 GB funciona com o swap que o script cria, mas o build fica lento.
- **Disco:** 40 GB+ (imagens Docker, banco, vídeos e backups).
- Exemplos: Hostinger VPS, Contabo, DigitalOcean, Hetzner, Magalu Cloud, Locaweb.
- Na criação, se o painel oferecer **"chave SSH"**, cole sua chave pública (seção 5.1). É mais seguro que senha.

### 4.2 Sequência

```powershell
# --- No seu PC (PowerShell) ---
ssh-keygen -t ed25519 -C "juliocesark@gmail.com"     # 1x na vida: cria seu par de chaves (seção 5.1)
# cadastre a chave pública na VPS (painel do provedor ou seção 5.1)

scp .\deploy\preparar-servidor.sh root@IP_DA_VPS:/root/   # envia o script (rode na pasta do projeto)
ssh root@IP_DA_VPS                                        # entra no servidor
```

```bash
# --- Na VPS ---
bash preparar-servidor.sh       # responde: domínio, se tem a versão sem acento, usuário e senha do painel
```

Enquanto isso, no **Registro.br**, crie os registros DNS do tipo **A** para `@` e `www`
apontando para o IP da VPS (detalhes no `README.md`, seção "Apontar o domínio").

```bash
# --- Conferindo ---
cd /opt/metonimia-app
docker compose ps               # os 3 serviços devem estar "Up" (db "healthy")
docker compose logs -f web      # acompanhe o Caddy obtendo o certificado ("certificate obtained successfully")
curl -I https://xn--metonmia-g2a.com.br   # deve responder HTTP/2 200
```

### 4.3 Fluxo de trabalho depois disso

```
PC: edita código → git commit → git push
                                   │
VPS: ssh root@IP → cd /opt/metonimia-app → ./deploy/atualizar.sh
```

---

## 5. SSH, SCP e companhia

**SSH** (*Secure Shell*) abre um terminal criptografado na VPS. O Windows 11 já vem com o cliente
`ssh`, `scp` e `sftp` (rode no PowerShell).

### 5.1 Chaves SSH (login sem senha, mais seguro)

Um par de chaves = **privada** (fica só no seu PC, nunca compartilhe) + **pública** (vai para o servidor).

```powershell
ssh-keygen -t ed25519 -C "juliocesark@gmail.com"
# Enter para aceitar o local: C:\Users\julio\.ssh\id_ed25519   (privada)
#                             C:\Users\julio\.ssh\id_ed25519.pub (pública)
# Uma "passphrase" protege a chave privada se o PC for roubado (recomendado)

type $env:USERPROFILE\.ssh\id_ed25519.pub      # mostra a chave pública (é ela que você cola no painel da VPS)
```

O Windows não tem `ssh-copy-id`. Para instalar a chave numa VPS em que você ainda entra com senha:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@IP_DA_VPS "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

No servidor, as chaves autorizadas ficam em `~/.ssh/authorized_keys` (uma por linha).

### 5.2 Apelido para não digitar o IP: `~/.ssh/config`

Crie o arquivo `C:\Users\julio\.ssh\config` (sem extensão):

```
Host metonimia
    HostName 203.0.113.10        # IP da VPS
    User root
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60       # mantém a conexão viva (não cai por inatividade)
```

Agora `ssh metonimia`, `scp arquivo metonimia:/root/` etc. funcionam.

### 5.3 Comandos SSH

| Comando | O que faz |
|---|---|
| `ssh root@IP` | Abre um terminal na VPS |
| `ssh -p 2222 root@IP` | Porta diferente da 22 |
| `ssh -i C:\caminho\chave root@IP` | Usa uma chave específica |
| `ssh root@IP "comando"` | Roda um comando remoto e volta (ex.: `ssh metonimia "cd /opt/metonimia-app && docker compose ps"`) |
| `ssh -v root@IP` | Modo detalhado, para descobrir por que a conexão falha |
| `exit` ou `Ctrl+D` | Sai do servidor |
| `ssh-keygen -R IP` | Remove o IP de `known_hosts` (necessário se você recriar a VPS com o mesmo IP e aparecer "REMOTE HOST IDENTIFICATION HAS CHANGED") |

### 5.4 SCP: copiar arquivos

Sintaxe: `scp ORIGEM DESTINO`. O lado remoto é escrito como `usuario@host:/caminho`.

```powershell
# PC → VPS
scp .\deploy\preparar-servidor.sh root@IP:/root/

# VPS → PC (baixar o backup do dia para a pasta atual ".")
scp root@IP:/opt/metonimia-app/backups/banco-2026-10-07.sql.gz .

# Pasta inteira (-r = recursivo)
scp -r root@IP:/opt/metonimia-app/backups C:\Users\julio\Backups\metonimia

# Porta diferente: -P maiúsculo (no ssh é -p minúsculo)
scp -P 2222 arquivo.txt root@IP:/root/
```

### 5.5 SFTP e rsync

```powershell
sftp root@IP              # sessão interativa de arquivos
#  ls / cd           → no servidor      lls / lcd → no seu PC
#  get arquivo       → baixa            put arquivo → envia
#  get -r pasta      → baixa pasta      bye → sai
```

`rsync` copia **só o que mudou** e retoma transferências interrompidas. Ótimo para sincronizar os
backups. Não vem no Windows; use dentro do WSL ou num Linux/Mac:

```bash
rsync -avz --progress root@IP:/opt/metonimia-app/backups/ ~/backups-metonimia/
# -a preserva datas/permissões, -v detalhado, -z comprime na transferência
```

Clientes gráficos, se preferir arrastar e soltar: **WinSCP** ou **FileZilla** (protocolo SFTP, porta 22).

### 5.6 Túnel SSH (acessar algo que não está exposto)

```powershell
ssh -L 5433:127.0.0.1:5432 root@IP
# enquanto essa sessão estiver aberta, localhost:5433 no SEU PC = 127.0.0.1:5432 NA VPS
```

Neste projeto o Postgres **não** publica porta nem na VPS, então o caminho padrão para mexer no
banco é `docker compose exec db psql ...` (seção 7). O túnel só funcionaria se você publicasse
`"127.0.0.1:5432:5432"` no serviço `db`. Aí daria para usar DBeaver/IntelliJ no seu PC com segurança.

### 5.7 Endurecendo o SSH (depois que o login por chave funcionar!)

```bash
# Na VPS. TESTE antes, numa SEGUNDA janela, que "ssh root@IP" entra sem pedir senha.
nano /etc/ssh/sshd_config.d/99-seguranca.conf
```

```
PasswordAuthentication no            # só entra com chave
PermitRootLogin prohibit-password    # root só por chave
```

```bash
sshd -t && systemctl restart ssh     # -t valida a configuração antes; restart aplica
```

Mantenha a janela antiga aberta até confirmar que uma nova conexão funciona. Se algo der errado,
quase todo provedor tem um **console web** de emergência no painel.

---

## 6. Linux: comandos que você vai usar no servidor

### Navegação e arquivos

| Comando | O que faz |
|---|---|
| `pwd` | Mostra a pasta atual |
| `ls -la` | Lista tudo, incluindo ocultos (`.env`), com permissões e tamanhos |
| `cd /opt/metonimia-app` · `cd ..` · `cd ~` | Entra numa pasta · sobe uma · vai para a home |
| `cat arquivo` · `less arquivo` | Mostra o arquivo inteiro · mostra paginado (`q` sai, `/texto` busca) |
| `tail -f /var/log/metonimia-backup.log` | Acompanha o fim de um arquivo ao vivo (`Ctrl+C` sai) |
| `nano arquivo` | Editor simples: `Ctrl+O` salva, `Ctrl+X` sai |
| `cp a b` · `mv a b` · `rm a` · `rm -r pasta` | Copia · move/renomeia · apaga · apaga pasta (**sem lixeira!**) |
| `mkdir -p a/b/c` | Cria pastas (inclusive intermediárias) |
| `chmod 600 .env` · `chmod +x script.sh` | Permissões: só dono lê/escreve · torna executável |
| `grep -r "texto" pasta/` | Procura texto em arquivos |
| `find . -name "*.sql.gz"` | Procura arquivos por nome |

### Sistema e recursos

| Comando | O que faz |
|---|---|
| `df -h` | Espaço em disco (`-h` = legível: G, M) |
| `du -sh /opt/metonimia-app/backups` | Tamanho de uma pasta |
| `free -h` | Memória RAM e swap |
| `htop` (ou `top`) | Processos e uso de CPU/RAM ao vivo (`q` sai). `apt install htop` se não tiver |
| `uptime` | Há quanto tempo está ligado e a carga |
| `reboot` | Reinicia a VPS (os containers voltam sozinhos) |
| `apt update && apt upgrade -y` | Atualiza o sistema |
| `systemctl status docker` | Estado de um serviço do sistema (`start`, `stop`, `restart`, `enable`) |
| `journalctl -u docker -n 100` | Últimas 100 linhas de log de um serviço do sistema |
| `ufw status` | Regras do firewall |
| `fail2ban-client status sshd` | IPs banidos por tentar invadir o SSH |
| `crontab -l` · `crontab -e` | Lista · edita as tarefas agendadas |
| `ss -tlnp` | Quais portas estão escutando e qual processo usa cada uma |
| `curl -I https://site` | Testa uma URL e mostra só os cabeçalhos |
| `nslookup dominio` · `dig dominio` | Confere para qual IP um domínio aponta |

### Atalhos do terminal

`Tab` completa nomes · `↑` comando anterior · `Ctrl+R` busca no histórico · `Ctrl+C` interrompe ·
`Ctrl+L` limpa a tela · `history` lista o histórico.

> **Dica: `tmux`.** Se a conexão cair no meio de um comando longo (ex.: primeiro build), ele é
> interrompido. Rode `tmux` antes. Se cair, reconecte e use `tmux attach` para voltar à mesma sessão.
> `Ctrl+B` e depois `D` desanexa sem matar.

---

## 7. Docker: conceitos e comandos

### 7.1 Conceitos em uma frase

| Termo | O que é |
|---|---|
| **Imagem** | "Molde" somente leitura com sistema + programa (ex.: `postgres:17-alpine`). Construída por um `Dockerfile` ou baixada do Docker Hub. |
| **Container** | Uma instância **rodando** de uma imagem. Descartável. |
| **Volume** | Pasta persistente gerenciada pelo Docker, montada dentro do container. Sobrevive à remoção do container. |
| **Rede** | O Compose cria uma rede privada onde os containers se acham pelo nome do serviço (`db`, `api`). |
| **Camada (layer)** | Cada instrução do Dockerfile gera uma camada em cache; se nada mudou, ela é reaproveitada. |
| **Compose** | Ferramenta que lê o `docker-compose.yml` e gerencia vários containers juntos. |

### 7.2 Docker Compose (o que você mais vai usar)

> Sempre dentro de `/opt/metonimia-app`. "serviço" = `db`, `api` ou `web`.

| Comando | O que faz |
|---|---|
| `docker compose ps` | Lista os serviços e o estado (Up, Exited, healthy...) |
| `docker compose up -d` | Cria/sobe tudo em segundo plano. Recria só o que mudou no compose/.env |
| `docker compose up -d --build` | Igual, mas reconstrói as imagens antes (use após `git pull`) |
| `docker compose up -d --build api` | Reconstrói e recria **só** a API |
| `docker compose logs -f api` | Logs ao vivo de um serviço (`Ctrl+C` sai; o container continua) |
| `docker compose logs --tail 200 api` | Últimas 200 linhas |
| `docker compose logs --since 30m` | Logs dos últimos 30 minutos, de todos |
| `docker compose restart api` | Reinicia o container (não relê o .env nem a imagem) |
| `docker compose stop` / `start` | Para / inicia os containers sem removê-los |
| `docker compose down` | Para **e remove** containers e rede. **Volumes ficam** (dados seguros) |
| `docker compose down -v` | ☠️ Remove também os **volumes**: apaga banco, fotos e certificados. Quase nunca use. |
| `docker compose exec api sh` | Abre um terminal **dentro** do container (`exit` sai) |
| `docker compose exec db psql -U metonimia -d metonimia` | Console SQL do banco (`\dt` lista tabelas, `\q` sai) |
| `docker compose build --no-cache web` | Reconstrói ignorando o cache (quando algo "estranho" persiste) |
| `docker compose pull` | Baixa versões novas das imagens prontas (`postgres`, base do Caddy) |
| `docker compose config` | Mostra o compose final com as variáveis do .env já substituídas (bom para depurar) |
| `docker compose top` | Processos rodando em cada container |

### 7.3 Docker "puro" (containers, imagens, volumes)

| Comando | O que faz |
|---|---|
| `docker ps` · `docker ps -a` | Containers rodando · todos (inclusive parados) |
| `docker logs -f <container>` | Logs de um container pelo nome/ID |
| `docker exec -it <container> sh` | Terminal dentro do container (`-i` interativo, `-t` terminal) |
| `docker stop <c>` · `docker start <c>` · `docker restart <c>` | Para · inicia · reinicia |
| `docker rm <c>` | Remove um container parado (`-f` força, mesmo rodando) |
| `docker run --rm -it alpine sh` | Cria um container temporário e descartável para testes |
| `docker images` | Imagens no disco |
| `docker rmi <imagem>` | Remove uma imagem |
| `docker volume ls` | Lista volumes (`metonimia-app_pgdata`, `metonimia-app_uploads`...) |
| `docker volume inspect metonimia-app_uploads` | Detalhes, incluindo onde fica no disco (`Mountpoint`) |
| `docker stats` | CPU, RAM e rede de cada container ao vivo |
| `docker inspect <c>` | Toda a configuração de um container em JSON |
| `docker cp <c>:/caminho ./destino` | Copia arquivos de/para um container |
| `docker system df` | Quanto espaço imagens, containers, volumes e cache ocupam |

### 7.4 Limpeza de disco

| Comando | Remove |
|---|---|
| `docker image prune -f` | Imagens "penduradas" (`<none>`), sobras de builds. Seguro. |
| `docker builder prune -f` | Cache de build. Seguro; o próximo build fica mais lento. |
| `docker system prune -f` | Containers parados, redes sem uso, imagens penduradas e cache. **Não** remove volumes. |
| `docker system prune -a -f` | Igual + **todas** as imagens não usadas por containers rodando. |
| `docker volume prune` | ☠️ Volumes sem container associado. Cuidado: com o projeto parado (`down`), isso pode apagar os dados. |

> **Logs do Docker crescem sem limite** por padrão e podem encher o disco em meses. Recomendação
> (uma vez, na VPS):
>
> ```bash
> cat > /etc/docker/daemon.json <<'EOF'
> { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
> EOF
> systemctl restart docker
> cd /opt/metonimia-app && docker compose up -d --force-recreate   # aplica aos containers
> ```

---

## 8. Rotinas de operação

### Publicar uma nova versão

```bash
cd /opt/metonimia-app && ./deploy/atualizar.sh
```

### Ver se está tudo bem

```bash
cd /opt/metonimia-app
docker compose ps                     # todos "Up"?
docker compose logs --tail 100 api    # erros na API?
df -h && free -h                      # disco e memória
```

### Backup manual e cópia para o seu PC

```bash
cd /opt/metonimia-app && ./deploy/backup.sh && ls -lh backups/
```

```powershell
scp -r root@IP:/opt/metonimia-app/backups C:\Users\julio\Backups\metonimia
```

### Restaurar o banco a partir do `backup.sh` (pg_dump)

```bash
cd /opt/metonimia-app
docker compose stop api                                   # ninguém escrevendo no banco
docker compose exec db psql -U metonimia -d postgres -c "DROP DATABASE metonimia;" -c "CREATE DATABASE metonimia;"
gunzip -c backups/banco-2026-10-07.sql.gz | docker compose exec -T db psql -U metonimia -d metonimia
docker compose start api
```

### Restaurar as fotos e vídeos

```bash
docker run --rm -v metonimia-app_uploads:/u -v "$PWD/backups":/b alpine tar xzf /b/uploads-2026-10-07.tar.gz -C /u
# fotos dos intérpretes (o usuário "app" do container precisa ser o dono dos arquivos)
docker run --rm -v metonimia-app_privado:/p -v "$PWD/backups":/b alpine sh -c "tar xzf /b/privado-2026-10-07.tar.gz -C /p && chown -R 100:101 /p"
docker compose exec api id app      # confira se uid/gid do usuário "app" são 100/101; se não, ajuste o chown acima
```

### Restaurar o `.sql` baixado pelo botão BACKUP do painel

```powershell
scp .\metonimia-backup-2026-10-07-1530.sql root@IP:/opt/metonimia-app/backups/
```

```bash
cd /opt/metonimia-app
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" metonimia' < backups/metonimia-backup-2026-10-07-1530.sql
# apaga as palestras/eventos atuais e insere os do arquivo (tudo numa transação)
```

### Trocar a senha do painel

O admin só é criado quando não existe. Para trocar:

```bash
cd /opt/metonimia-app
nano .env                                                        # novo ADMIN_PASSWORD
docker compose exec db psql -U metonimia -d metonimia -c "DELETE FROM admin_usuario;"
docker compose up -d                                             # recria a API com o .env novo → admin recriado
```

### Migrar para outra VPS

1. Na VPS antiga: `./deploy/backup.sh` e baixe `backups/` e o `.env` (via `scp`).
2. Na nova: rode o `preparar-servidor.sh`. Antes do passo 6, copie o `.env` antigo para
   `/opt/metonimia-app/.env` para manter as mesmas senhas.
3. Restaure banco e uploads (acima) e aponte o DNS para o IP novo.

---

## 8.1 Buscadores e IAs (depois que o site estiver no ar)

O que já está no código: home pré-renderizada (legível sem JavaScript), título e descrição com as
palavras-chave, dados estruturados schema.org (organização, serviços, perguntas frequentes),
`robots.txt`, `sitemap.xml` e `llms.txt` (resumo para assistentes de IA). Perguntas frequentes:
`frontend/src/app/core/seo.ts`. Serviços: editados no painel (`/admin/servicos`). O HTML
pré-renderizado (o que robôs sem JavaScript leem) usa o retrato `SERVICOS_PADRAO` do `seo.ts`,
porque não há API durante o build. Se os serviços mudarem muito, atualize esse retrato.

O que só você pode fazer:

1. **Google Search Console** (search.google.com/search-console): adicione o domínio, confirme pelo
   registro TXT no Registro.br e envie `https://xn--metonmia-g2a.com.br/sitemap.xml`.
2. **Bing Webmaster Tools** (bing.com/webmasters): pode importar do Search Console. O índice do Bing
   alimenta o ChatGPT (busca) e o Copilot.
3. **Perfil da Empresa no Google** (business.google.com): é o que aparece no Maps e em "intérprete
   de Libras perto de mim". Categoria sugerida: "Serviço de intérprete" / "Tradutor".
4. **Redes sociais e diretórios:** mantenha o mesmo nome, telefone e link do site em Instagram,
   LinkedIn, YouTube etc. Quando existirem, coloque os links em `sameAs` no `seo.ts`.
5. **Validar:** search.google.com/test/rich-results e validator.schema.org com o endereço do site.

## 9. Problemas comuns

| Sintoma | Onde olhar / o que fazer |
|---|---|
| Site não abre | `docker compose ps` (o `web` está Up?) · `ufw status` (80/443 liberadas?) · firewall do **painel do provedor** também precisa liberar 80/443 |
| HTTPS não sai / erro de certificado | `docker compose logs web`. Quase sempre é o DNS ainda não apontando para a VPS (`nslookup xn--metonmia-g2a.com.br`) |
| Página abre mas palestras não carregam | `docker compose logs --tail 200 api` |
| API reiniciando em loop | `docker compose logs api`. Variável faltando no `.env` (ex.: `APP_JWT_SECRET` curto) ou banco fora do ar |
| Build morre / "Killed" / `exit code 137` | Falta de memória. `free -h`; confirme o swap (`swapon --show`) ou aumente a VPS |
| "no space left on device" | `df -h` · `docker system df` · `docker system prune -f` · apague backups antigos · configure a rotação de logs (7.4) |
| `git pull` recusa | Alguém editou arquivo direto na VPS: `git status` mostra; `git stash` ou `git checkout -- arquivo` |
| "REMOTE HOST IDENTIFICATION HAS CHANGED" | VPS recriada com o mesmo IP: `ssh-keygen -R IP` no seu PC |
| Login do painel não aceita a senha nova do `.env` | O admin já existia. Veja "Trocar a senha do painel" |
