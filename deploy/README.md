# Deploying to an Ethio Telecom (or any Linux) VPS

Self-hosts the whole app locally: **Next.js app + PostgreSQL**, both on one VPS,
run with Docker Compose. Nginx terminates HTTPS and proxies to the app.

## Prerequisites (on the VPS)
- Ubuntu 22.04+ (or Debian), root/sudo, ports **80** and **443** open.
- Docker Engine + the Compose plugin:
  ```sh
  curl -fsSL https://get.docker.com | sh
  ```

## 1. Get the code + secrets
```sh
git clone <repo-url> cober && cd cober
cp deploy/env.production.example .env
nano .env      # set POSTGRES_PASSWORD and SESSION_SECRET (openssl rand -base64 32)
```

## 2. Start the stack (builds the image, runs migrations, starts app + DB)
```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app   # watch it come up
```
The app is now on `127.0.0.1:3000`. Migrations run automatically on start.

## 3. Point the domain
At the domain's DNS (currently Yegara), set:
- `A` record `@` (coberbusiness.org)      -> the VPS public IP
- `A` record `www`                        -> the VPS public IP

## 4. Nginx + HTTPS
```sh
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/coberbusiness.org
sudo ln -s /etc/nginx/sites-available/coberbusiness.org /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d coberbusiness.org -d www.coberbusiness.org
```
Visit https://coberbusiness.org — done.

## 5. First admin user
The database starts empty. Seed a starter admin/role set (no demo data):
```sh
docker compose -f docker-compose.prod.yml exec app npx tsx prisma/seed.ts
```
(Or migrate existing data — see below.)

## Backups
```sh
chmod +x deploy/backup.sh
crontab -e   # add:  0 2 * * * /root/cober/deploy/backup.sh >> /var/log/cober-backup.log 2>&1
```

## Updating later
```sh
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## (Optional) Bring current data over from Neon
Only if you want to keep the existing records instead of starting fresh:
```sh
# from a machine that can reach Neon:
pg_dump "<NEON_CONNECTION_STRING>" --no-owner --no-privileges -Fc -f cober.dump
# copy cober.dump to the VPS, then:
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists < cober.dump
```
