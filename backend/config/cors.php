<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Aquí debes incluir explícitamente el origen de tu frontend en Vercel
    'allowed_origins' => [
        'https://ovni-xi.vercel.app',
        'http://localhost:3000', // Por si pruebas en local con React/Next.js
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // Crucial si manejas cookies/sesiones con Sanctum
];