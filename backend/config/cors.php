<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Cambiado: Especificamos tu URL real de Vercel en lugar de '*'
    'allowed_origins' => [
        'https://ovni-xi.vercel.app'
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Cambiado: Lo pasamos a true por si React envía cookies/tokens (ej. con Axios withCredentials)
    'supports_credentials' => true,

];