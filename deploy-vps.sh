#!/bin/bash
# ==============================================================================
# WA Sender - Production VPS Deployment Script for Ubuntu / Debian
# ==============================================================================

set -e

echo "🚀 Starting WA Sender Production VPS Setup..."

# 1. Update Packages & Install System Dependencies
echo "📦 Installing Linux Dependencies & Puppeteer Libraries..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Puppeteer Chromium Dependencies for WhatsApp Web
sudo apt install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget x11-utils

# 2. Install Node.js (v20 LTS) if not installed
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "⚡ Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 4. Install Application Dependencies & Prisma Setup
echo "🛠️ Installing npm packages and generating Prisma Client..."
npm install
npx prisma generate
npx prisma db push

# 5. Build Production Next.js App
echo "🏗️ Building Next.js App for Production..."
npm run build

# 6. Start / Reload App with PM2
echo "🚀 Starting application with PM2..."
pm2 startOrReload ecosystem.config.js
pm2 save
sudo pm2 startup | tail -n 1 | bash || true

echo "✅ Deployment complete! Don't forget to configure NGINX & SSL for your domain."
