FROM richarvey/nginx-php-fpm:3.1.6

# Copiar el código del backend al directorio web del contenedor
COPY . .

# Permitir que composer corra como superusuario
ENV COMPOSER_ALLOW_SUPERUSER 1

# Instalar dependencias de PHP durante la compilación de la imagen (más rápido y seguro)
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Configuración del contenedor para Laravel
ENV SKIP_COMPOSER 1
ENV WEBROOT /var/www/html/public
ENV PHP_ERRORS_STDERR 1
ENV RUN_SCRIPTS 1
ENV REAL_IP_HEADER 1

# Configuración del entorno de Laravel
ENV APP_ENV production
ENV APP_DEBUG false
ENV LOG_CHANNEL stderr

# Otorgar permisos a las carpetas de almacenamiento y caché de Laravel
RUN chmod -R 775 storage bootstrap/cache
RUN chown -R www-data:www-data storage bootstrap/cache

# Puerto expuesto (Render mapeará este puerto automáticamente)
EXPOSE 80

# Iniciar Nginx y PHP-FPM
CMD ["/start.sh"]
