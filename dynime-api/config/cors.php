<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'),
        env('APP_URL', 'http://localhost:8000'),
        // Dev: allow any localhost port (Vite can use 5000-5010, etc.)
        'http://localhost:5000',
        'http://localhost:5001',
        'http://localhost:5002',
        'http://localhost:5003',
        'http://localhost:5004',
        'http://localhost:5005',
        'http://localhost:3000',
        'http://127.0.0.1:5001',
        'http://127.0.0.1:5173',
    ],
    'allowed_origins_patterns' => ['#^http://localhost(:\d+)?$#', '#^http://127\.0\.0\.1(:\d+)?$#'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
