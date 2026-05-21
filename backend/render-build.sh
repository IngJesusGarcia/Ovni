#!/bin/bash
# Render build script for Laravel

# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Laravel optimizations
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force

# Storage link
php artisan storage:link 2>/dev/null || true
