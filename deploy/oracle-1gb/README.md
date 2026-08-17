# Oracle 1 GB VPS Deployment

This deployment path is optimized for a small Ubuntu Oracle VPS with 1 GB RAM and 50 GB storage.

Use a lightweight runtime:

- Nginx serves the frontend static build.
- Node runs the backend through systemd.
- PostgreSQL runs directly on the VPS.
- Docker is not used for the app runtime.
- Swap is enabled before dependency install and build.

## Server Packages

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib rsync
```

## Swap

```bash
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
node -v
corepack pnpm --version
```

## Clone And Install

```bash
sudo mkdir -p /opt/larry-control
sudo chown -R "$USER:$USER" /opt/larry-control
git clone https://github.com/kumaark7/Web_Minecraft_AFK-_Bot.git /opt/larry-control
cd /opt/larry-control
corepack pnpm install --frozen-lockfile
```

## PostgreSQL

Create a database user and database. Replace the password with a strong server-only value.

```bash
sudo -u postgres psql
```

```sql
CREATE USER larry WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE larrycontrol OWNER larry;
GRANT ALL PRIVILEGES ON DATABASE larrycontrol TO larry;
\q
```

For 1 GB RAM, keep PostgreSQL conservative. Find the config path:

```bash
sudo -u postgres psql -t -P format=unaligned -c "SHOW config_file;"
```

Edit the shown `postgresql.conf` and set:

```conf
shared_buffers = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 512MB
max_connections = 20
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql --no-pager
```

## Backend Environment

Create the production env file outside Git:

```bash
sudo mkdir -p /etc/larry-control
sudo nano /etc/larry-control/backend.env
```

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://YOUR_SERVER_IP_OR_DOMAIN
DATABASE_URL=postgresql://larry:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/larrycontrol
COOKIE_SECURE=false
```

Use `COOKIE_SECURE=false` for plain HTTP on an IP address. Change it to `true` after adding HTTPS.

```bash
sudo chmod 600 /etc/larry-control/backend.env
```

## Prisma And Build

```bash
cd /opt/larry-control
set -a
. /etc/larry-control/backend.env
set +a

corepack pnpm --dir packages/database db:generate
corepack pnpm --dir packages/database db:migrate
corepack pnpm build
```

## Frontend Static Files

```bash
sudo mkdir -p /var/www/larry-control
sudo rsync -a --delete /opt/larry-control/apps/web/dist/ /var/www/larry-control/
sudo chown -R www-data:www-data /var/www/larry-control
```

## Backend Service

```bash
sudo cp /opt/larry-control/deploy/oracle-1gb/larry-control-backend.service /etc/systemd/system/larry-control-backend.service
sudo chown -R www-data:www-data /opt/larry-control
sudo systemctl daemon-reload
sudo systemctl enable larry-control-backend
sudo systemctl start larry-control-backend
sudo systemctl status larry-control-backend --no-pager
```

Expected logs:

```bash
sudo journalctl -u larry-control-backend -n 80 --no-pager
```

```text
[Backend] Successfully connected to PostgreSQL via Prisma.
[Backend] Server is running on http://localhost:3001
```

## Nginx

```bash
sudo cp /opt/larry-control/deploy/oracle-1gb/nginx.conf /etc/nginx/sites-available/larry-control
sudo ln -sf /etc/nginx/sites-available/larry-control /etc/nginx/sites-enabled/larry-control
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Open inbound port `80` in the Oracle Cloud security list. If you later add SSL, open `443`.

## Verification

```bash
curl -i http://127.0.0.1:3001/api/health
curl -i http://localhost/api/health
curl -I http://localhost
free -h
systemctl status larry-control-backend --no-pager
systemctl status nginx --no-pager
systemctl status postgresql --no-pager
```

The browser URL is:

```text
http://YOUR_SERVER_IP_OR_DOMAIN
```

## 1 GB Operating Rules

- Do not run Vite dev server in production.
- Do not run Docker for the app runtime.
- Start with one Mineflayer bot later and measure memory.
- Keep PostgreSQL `max_connections` low.
- Keep swap enabled.
- Avoid heavy background services.
