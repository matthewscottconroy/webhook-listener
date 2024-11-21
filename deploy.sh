#!/bin/bash

owner=$1
repo=$2

REPO_URL="https://github.com/$owner/$repo.git"
APP_DIR="/var/www/node-app/$owner/$repo"

echo "Starting deployment process..."

if [ ! -d "$APP_DIR" ]; then
    echo "Cloning repository..."
    git clone $REPO_URL $APP_DIR
else
    echo "Pulling latest changes..."
    cd $APP_DIR && git pull origin main
fi

echo "Installing dependencies..."
cd $APP_DIR && npm install

echo "Restarting application..."
pm2 restart app.js || pm2 start app.js --name "$owner-$repo"

echo "Deployment complete!"

