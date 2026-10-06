# metonimia-app

Site da **Metonímia Produções Acessíveis** com painel para publicar palestras e eventos.

| Pasta       | O que é                                   | IDE          |
|-------------|-------------------------------------------|--------------|
| `frontend/` | Angular 22 — site público + painel `/admin` | VS Code      |
| `backend/`  | Spring Boot 4.1 (Java 21) — API e login    | IntelliJ     |
| `deploy/`   | Caddy (HTTPS), scripts de atualização e backup | —        |

## Como funciona

- **Site público** (`/`): mesmo design da landing page anterior. As seções *Palestras* e *Eventos*
  leem a API e se dividem em `#palestras_futuras` / `#palestras_passadas` e
  `#eventos_futuros` / `#eventos_passados`. Ninguém precisa mover nada: a página compara a data/hora
  com o relógio e recalcula a cada minuto.
- **Fale Conosco**: formulário enviado pelo [FormSubmit](https://formsubmit.co) para
  `juliocesark@gmail.com` + botão do WhatsApp. Não passa pelo backend. Para trocar o e-mail ou o
  número, edite `frontend/src/app/core/config.ts`.
- **Painel** (`/admin`): login → botões PALESTRAS e EVENTOS → lista em accordion (data decrescente)
  com Editar/Excluir → "ADICIONAR PALESTRA" com data, hora, local, descrição (editor com fonte,
  tamanho, cor, negrito, itálico e cor de fundo), fotos (com texto alternativo) e vídeos (arquivo ou
  link do YouTube/Vimeo).

### API

| Método | Rota                               | Acesso  |
|--------|------------------------------------|---------|
| POST   | `/api/auth/login`                  | aberto (5 tentativas erradas / 15 min por IP) |
| GET    | `/api/public/publicacoes?tipo=PALESTRA\|EVENTO` | aberto |
| GET    | `/api/admin/publicacoes?tipo=…`    | JWT     |
| GET/PUT/DELETE | `/api/admin/publicacoes/{id}` | JWT  |
| POST   | `/api/admin/publicacoes`           | JWT     |
| POST   | `/api/admin/uploads` (multipart `arquivo`) | JWT |

O HTML da descrição é limpo no servidor (jsoup) antes de ser gravado. Uploads são conferidos pelo
conteúdo do arquivo (não só pela extensão): JPG/PNG/WEBP/GIF até 10 MB, MP4/WEBM até 200 MB.

---

## Rodar no seu computador

Pré-requisitos: **Java 21**, **Node.js 24** (ou 22.22.3+), Git.

**1. Backend (IntelliJ)** — abra a pasta `backend/` como projeto Maven e rode `MetonimiaApplication`.
O perfil `dev` é o padrão: usa banco H2 em `backend/data/` e cria o login **admin / admin12345**.
Pelo terminal: `cd backend` e `mvn spring-boot:run`. A API sobe em http://localhost:8080.

**2. Frontend (VS Code)**

```powershell
cd frontend
npm install
npm start
```

Abra http://localhost:4200 (site) e http://localhost:4200/admin (painel). O `proxy.conf.json`
encaminha `/api` e `/uploads` para o backend, então não há configuração de CORS.

**Testes:** `cd backend && mvn test` · `cd frontend && npx ng build`

---

## Primeiro envio para o GitHub

```powershell
cd C:\Users\julio\metonimia-app
git init
git add .
git commit -m "first commit: frontend Angular + backend Spring Boot"
git remote add origin https://github.com/JulioKhichfy/metonimia-app.git
git branch -M main
git push -u origin main
```

---

## Publicar em produção (VPS)

Um plano de hospedagem "Node.js" não serve: o Spring Boot precisa de uma JVM rodando o tempo todo.
Use uma VPS Linux (Ubuntu 24.04) com **pelo menos 4 GB de RAM** — o build roda no próprio servidor.

### 1. Preparar o servidor (uma vez)

Não é preciso instalar PostgreSQL, Java nem Node no servidor: tudo roda em containers Docker
(o banco é o serviço `db` do `docker-compose.yml`). O script abaixo faz toda a preparação.

No PowerShell do seu computador:

```powershell
scp C:\Users\julio\metonimia-app\deploy\preparar-servidor.sh root@IP_DO_SERVIDOR:/root/
ssh root@IP_DO_SERVIDOR
```

Já no servidor:

```bash
bash preparar-servidor.sh
```

Ele instala Docker, firewall e fail2ban, cria swap se faltar memória, baixa o projeto em
`/opt/metonimia-app`, gera o `.env` com senhas aleatórias (pergunta o domínio e a senha do painel),
confere o DNS, sobe os containers e agenda o backup diário. Pode ser executado de novo sem problema.

### 2. Apontar o domínio (DNS)

`metonímia.com.br` é escrito na internet como **`xn--metonmia-g2a.com.br`** (punycode). No
[Registro.br](https://registro.br): **Domínios → metonímia.com.br → DNS → Configurar endereçamento →
Modo avançado** e crie:

| Tipo | Nome  | Valor            |
|------|-------|------------------|
| A    | (vazio / @) | IP da VPS  |
| A    | www   | IP da VPS        |

Se o domínio foi comprado por um revendedor (ex.: GoDaddy), crie os mesmos registros no painel dele.
Confira a propagação com `nslookup xn--metonmia-g2a.com.br` antes do passo 3.

A versão **sem acento** (`metonimia.com.br`) é outro domínio: só você pode registrá-la, mas é
preciso registrar e apontar à parte. Depois, inclua-a em `REDIRECT_DOMAINS` no `.env`.

### 3. Conferir

O script já sobe tudo. O Caddy emite o certificado HTTPS sozinho assim que o DNS propagar.
Acesse `https://metonímia.com.br/admin`. Para acompanhar: `cd /opt/metonimia-app && docker compose logs -f`.

### 4. Depois de cada `git push`

```bash
cd /opt/metonimia-app && ./deploy/atualizar.sh
```

### Backup

```bash
cd /opt/metonimia-app
./deploy/backup.sh       # manual; o script de preparação já agendou um backup diário às 3h
```

Copie a pasta `backups/` para fora do servidor de vez em quando.

### Trocar a senha do painel

O administrador é criado só na primeira vez. Para trocar a senha:

```bash
nano .env                                   # novo ADMIN_PASSWORD
docker compose exec db psql -U metonimia -d metonimia -c "DELETE FROM admin_usuario;"
docker compose restart api
```

---

## FormSubmit

No primeiro envio real do formulário, o FormSubmit manda um e-mail de ativação para
`juliocesark@gmail.com`. Clique no link uma vez. Depois disso, o FormSubmit oferece um endereço
aleatório para usar no lugar do e-mail (assim ele não fica visível no código do site) — basta
trocar em `frontend/src/app/core/config.ts`.
