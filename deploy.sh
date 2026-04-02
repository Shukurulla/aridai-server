#!/bin/bash
# Aridai Backend Deploy Script
# Server: 109.205.176.124
# Domain: server.aridai.kz

set -e

echo "=== 1. Paketlarni o'rnatish ==="
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

echo "=== 2. Loyiha papkasini yaratish ==="
sudo mkdir -p /var/www/aridai-api
sudo chown $USER:$USER /var/www/aridai-api

echo "=== 3. Fayllarni nusxalash ==="
echo "Loyihani /var/www/aridai-api ga nusxalang:"
echo "  scp -r backend/* user@109.205.176.124:/var/www/aridai-api/"
echo ""
echo "Yoki git clone qiling"

echo "=== 4. Dependency o'rnatish ==="
cd /var/www/aridai-api
npm install --production

echo "=== 5. .env yaratish ==="
cat > .env << 'EOF'
PORT=4891
MONGODB_URI=mongodb://root:SuperStrongPassword123@109.205.176.124:27017/aridai?authSource=admin&directConnection=true
JWT_SECRET=aridai_s3cr3t_k3y_2026_kz_music_platform
CLIENT_URL=https://admin.aridai.kz
EOF

echo "=== 6. Upload papkalarini yaratish ==="
mkdir -p uploads/tracks uploads/covers backups

echo "=== 7. Nginx sozlash ==="
sudo cp nginx.conf /etc/nginx/sites-available/aridai-api
sudo ln -sf /etc/nginx/sites-available/aridai-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=== 8. SSL sertifikat olish ==="
sudo certbot --nginx -d server.aridai.kz --non-interactive --agree-tos -m admin@aridai.kz

echo "=== 9. PM2 bilan ishga tushirish ==="
cd /var/www/aridai-api
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "✅ Deploy tugadi!"
echo "API: https://server.aridai.kz/api/health"
