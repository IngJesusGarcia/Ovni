FROM richarvey/nginx-php-fpm:3.1.6

# Copiar el código del backend al directorio web del contenedor
COPY . .

# Permitir que composer corra como superusuario
ENV COMPOSER_ALLOW_SUPERUSER 1

# Instalar dependencias de PHP durante la compilación
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Configuración del contenedor para Laravel
ENV SKIP_COMPOSER 1
ENV WEBROOT /var/www/html/public
ENV PHP_ERRORS_STDERR 1
ENV REAL_IP_HEADER 1

# Desactivar scripts conflictivos internos de la imagen base
ENV RUN_SCRIPTS false

# Configuración del entorno de Laravel
ENV APP_ENV production
ENV APP_DEBUG false
ENV LOG_CHANNEL stderr

# Otorgar permisos a las carpetas de almacenamiento y caché de Laravel
RUN chmod -R 775 storage bootstrap/cache
RUN chown -R www-data:www-data storage bootstrap/cache

# ❌ BORRAMOS LA LÍNEA DE "RUN php artisan config:cache" AQUÍ 
# Para que Laravel lea las variables de entorno de Render en tiempo real.

# Copiar la configuración del sitio directamente a la carpeta de Nginx
COPY nginx.conf /etc/nginx/sites-available/default.conf

# Puerto expuesto
EXPOSE 80

# Iniciar Nginx y PHP-FPM
CMD ["/start.sh"]