FROM richarvey/nginx-php-fpm:3.1.6

# Copiar el código del backend al directorio web del contenedor
COPY . .

# Permitir que composer corra como superusuario
ENV COMPOSER_ALLOW_SUPERUSER 1

# Instalar dependencias de PHP durante la compilación
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Configuración del contenedor para Laravel (CRUCIALES PARA ENRUTAMIENTO)
ENV SKIP_COMPOSER 1
ENV WEBROOT /var/www/html/public
ENV PHP_ERRORS_STDERR 1
ENV REAL_IP_HEADER 1

# --- LAS DOS LÍNEAS CLAVE PARA QUE ESTA IMAGEN ENRUTE LARAVEL CORRECTAMENTE ---
ENV ENABLE_LARAVEL_KW_ROUTES true
ENV RUN_SCRIPTS false 
# ------------------------------------------------------------------------------

# Configuración del entorno de Laravel
ENV APP_ENV production
ENV APP_DEBUG false
ENV LOG_CHANNEL stderr

# Asegurar permisos correctos para Laravel
RUN chmod -R 775 storage bootstrap/cache
RUN chown -R www-data:www-data storage bootstrap/cache

# Limpiar y optimizar la caché de rutas y configuración en la compilación
RUN php artisan config:cache && php artisan route:cache

# Puerto expuesto
EXPOSE 80

# Iniciar Nginx y PHP-FPM
CMD ["/start.sh"]