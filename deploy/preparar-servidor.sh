#!/usr/bin/env bash
# =============================================================================
#  Metonímia — preparação do servidor (Ubuntu 24.04, rodar como root)
#
#  Uso:  bash preparar-servidor.sh
#
#  O que faz (pode rodar de novo sem estragar nada):
#   1. Atualiza o sistema e instala git, firewall, fail2ban e atualizações automáticas
#   2. Cria memória swap se o servidor tiver pouca RAM (o build do Angular/Maven precisa)
#   3. Instala Docker + Docker Compose
#   4. Libera no firewall apenas SSH, HTTP e HTTPS
#   5. Baixa o projeto do GitHub em /opt/metonimia-app
#   6. Cria o .env com senhas aleatórias (pergunta domínio e senha do painel)
#   7. Confere se o DNS já aponta para este servidor
#   8. Sobe tudo: PostgreSQL, API Spring Boot e site com HTTPS (Caddy)
#   9. Agenda backup diário às 3h
#
#  O PostgreSQL NÃO é instalado no sistema: ele roda dentro de um container Docker
#  (serviço "db" do docker-compose.yml), com os dados num volume persistente.
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/JulioKhichfy/metonimia-app.git}"
DIR="${DIR:-/opt/metonimia-app}"
DOMINIO_PADRAO="metonímia.com.br"

verde() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m[aviso] %s\033[0m\n' "$*"; }
erro()  { printf '\033[1;31m[erro] %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || erro "Rode como root (ou: sudo bash $0)."
grep -qi ubuntu /etc/os-release || aviso "Script testado para Ubuntu; outro sistema pode exigir ajustes."

export DEBIAN_FRONTEND=noninteractive

# -----------------------------------------------------------------------------
verde "1/9 Atualizando o sistema e instalando ferramentas básicas"
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades openssl python3 cron
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban cron

# -----------------------------------------------------------------------------
verde "2/9 Verificando memória (swap)"
RAM_MB=$(free -m | awk '/^Mem:/ {print $2}')
if [ "$RAM_MB" -lt 3800 ] && ! swapon --show | grep -q .; then
  echo "RAM de ${RAM_MB} MB: criando swap de 2 GB em /swapfile"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  echo "RAM de ${RAM_MB} MB — swap não é necessário ou já existe."
fi

# -----------------------------------------------------------------------------
verde "3/9 Instalando Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Docker já instalado: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# -----------------------------------------------------------------------------
verde "4/9 Configurando firewall (SSH, 80, 443)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
ufw status

# -----------------------------------------------------------------------------
verde "5/9 Baixando o projeto em $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  echo "Se o repositório for privado, o Git vai pedir usuário e senha."
  echo "Na senha, use um Personal Access Token do GitHub (não a senha da conta)."
  git clone "$REPO_URL" "$DIR"
fi
cd "$DIR"
chmod +x deploy/*.sh

# -----------------------------------------------------------------------------
verde "6/9 Criando o arquivo .env"
SENHA_GERADA=""
if [ -f .env ]; then
  echo ".env já existe — mantendo as configurações atuais."
  DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"')
  ADMIN_USERNAME=$(grep -E '^ADMIN_USERNAME=' .env | cut -d= -f2- | tr -d '"')
else
  read -rp "Domínio principal [$DOMINIO_PADRAO]: " DOMINIO_DIGITADO
  DOMINIO_DIGITADO="${DOMINIO_DIGITADO:-$DOMINIO_PADRAO}"
  # converte acentos para punycode (metonímia.com.br -> xn--metonmia-g2a.com.br)
  DOMAIN=$(python3 -c "import sys; print(sys.argv[1].strip().lower().encode('idna').decode())" "$DOMINIO_DIGITADO")
  REDIRECT_DOMAINS="www.$DOMAIN"

  read -rp "Você também registrou metonimia.com.br (sem acento) e apontou o DNS para cá? [s/N]: " SEM_ACENTO
  if [[ "${SEM_ACENTO,,}" == s* ]]; then
    REDIRECT_DOMAINS="$REDIRECT_DOMAINS, metonimia.com.br, www.metonimia.com.br"
  fi

  read -rp "Usuário do painel [admin]: " ADMIN_USERNAME
  ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

  while true; do
    read -rsp "Senha do painel (mín. 10 caracteres; Enter = gerar automaticamente): " ADMIN_PASSWORD; echo
    if [ -z "$ADMIN_PASSWORD" ]; then
      ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
      SENHA_GERADA="$ADMIN_PASSWORD"
      break
    fi
    [ "${#ADMIN_PASSWORD}" -ge 10 ] || { aviso "Muito curta."; continue; }
    [[ "$ADMIN_PASSWORD" != *"'"* ]] || { aviso "Não use aspas simples (') na senha."; continue; }
    read -rsp "Repita a senha: " CONFIRMA; echo
    [ "$ADMIN_PASSWORD" == "$CONFIRMA" ] && break
    aviso "As senhas não conferem."
  done

  DB_USERNAME=metonimia
  DB_PASSWORD=$(openssl rand -hex 24)
  APP_JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')

  umask 077
  cat > .env <<EOF
# Gerado por preparar-servidor.sh em $(date '+%d/%m/%Y %H:%M'). NÃO suba este arquivo para o GitHub.
DOMAIN=$DOMAIN
REDIRECT_DOMAINS="$REDIRECT_DOMAINS"
CONTATO_EMAIL=assessoria@metonimia.com.br
CONTATO_WHATSAPP="+55 21 99896-1769"
# E-mail (SMTP) para mensagens aos intérpretes: preencha quando tiver o e-mail da assessoria
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=assessoria@metonimia.com.br
MAIL_PASSWORD=
MAIL_REMETENTE=assessoria@metonimia.com.br
MENSAGEM_COPIA_EMAIL=assessoria@metonimia.com.br
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
APP_JWT_SECRET=$APP_JWT_SECRET
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD='$ADMIN_PASSWORD'
EOF
  umask 022
  echo ".env criado (permissão 600)."
fi

# -----------------------------------------------------------------------------
verde "7/9 Conferindo o DNS"
IP_SERVIDOR=$(curl -4 -fsS --max-time 10 https://api.ipify.org || echo "?")
IP_DOMINIO=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)
echo "IP deste servidor: $IP_SERVIDOR"
echo "IP do domínio $DOMAIN: ${IP_DOMINIO:-não encontrado}"
if [ "$IP_SERVIDOR" != "$IP_DOMINIO" ]; then
  aviso "O domínio ainda não aponta para este servidor."
  aviso "Crie no Registro.br os registros A de '@' e 'www' para $IP_SERVIDOR."
  aviso "O site sobe mesmo assim; o HTTPS é emitido sozinho quando o DNS propagar."
fi

# -----------------------------------------------------------------------------
verde "8/9 Construindo e subindo os containers (a primeira vez leva de 5 a 15 minutos)"
docker compose up -d --build

echo "Aguardando a API iniciar..."
for _ in $(seq 1 60); do
  if docker compose logs api 2>/dev/null | grep "Started MetonimiaApplication" >/dev/null; then
    echo "API no ar."
    break
  fi
  sleep 5
done
docker compose ps

# -----------------------------------------------------------------------------
verde "9/9 Agendando backup diário (3h da manhã)"
LINHA_CRON="0 3 * * * cd $DIR && ./deploy/backup.sh >> /var/log/metonimia-backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'metonimia.*backup.sh' || true; echo "$LINHA_CRON" ) | crontab -
crontab -l | grep backup.sh

# -----------------------------------------------------------------------------
verde "Pronto!"
DOMINIO_LEGIVEL=$(python3 -c "import sys; print(sys.argv[1].encode().decode('idna'))" "$DOMAIN" 2>/dev/null || echo "$DOMAIN")
cat <<EOF

  Site:    https://$DOMINIO_LEGIVEL
  Painel:  https://$DOMINIO_LEGIVEL/admin
  Usuário: $ADMIN_USERNAME
EOF
if [ -n "$SENHA_GERADA" ]; then
  printf '  Senha:   \033[1m%s\033[0m   <- ANOTE AGORA (também está em %s/.env)\n' "$SENHA_GERADA" "$DIR"
fi
cat <<EOF

  Comandos úteis (dentro de $DIR):
    docker compose ps                 situação dos serviços
    docker compose logs -f api        logs da API (Ctrl+C para sair)
    docker compose logs -f web        logs do Caddy/HTTPS
    ./deploy/atualizar.sh             publicar a versão mais nova do GitHub
    ./deploy/backup.sh                backup manual em ./backups
EOF
