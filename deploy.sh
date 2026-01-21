#!/bin/bash

# Deploy script for Book Club Mini App on VPS

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Variables
PROJECT_DIR="/path/to/BookClubMiniApp"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"

# 1. Pull latest code
echo "📥 Pulling latest code..."
cd $PROJECT_DIR
git pull origin main

# 2. Backend setup
echo "🔧 Setting up backend..."
cd $BACKEND_DIR

# Create virtual environment if not exists
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv venv
fi

# Activate venv and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations (create tables)
python -m app.init_db

# 3. Restart backend service
echo "🔄 Restarting backend service..."
sudo systemctl restart bookclub.service
sudo systemctl status bookclub.service --no-pager

# 4. Reload nginx
echo "🌐 Reloading nginx..."
sudo nginx -t
sudo systemctl reload nginx

# 5. Check health
echo "🏥 Checking API health..."
sleep 2
curl -f http://localhost:8000/api/health || echo "⚠️ Health check failed"

echo "✅ Deployment completed!"
echo "📱 Open https://yourdomain.com in Telegram Mini App"
