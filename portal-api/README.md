# Portal Universitas Harapan Medan — Backend API

Laravel 12 + SQLite + JWT Auth (tymon/jwt-auth)

## Prasyarat

- PHP >= 8.2 (dengan ekstensi: pdo_sqlite, mbstring, openssl)
- Composer (https://getcomposer.org)

## Setup (10 Langkah)

```bash
# 1. Masuk folder
cd portal-api

# 2. Install dependencies
composer install

# 3. Buat .env
cp .env.example .env

# 4. Generate APP_KEY
php artisan key:generate

# 5. Generate JWT_SECRET
php artisan jwt:secret

# 6. Buat database SQLite
touch database/database.sqlite

# 7. Jalankan migration
php artisan migrate

# 8. Isi data demo
php artisan db:seed

# 9. Symlink storage
php artisan storage:link

# 10. Jalankan server
php artisan serve
```

Server: http://localhost:8000

## Akun Demo

| Role       | Email                    | Password   |
|------------|--------------------------|------------|
| Admin      | admin@unhar.ac.id        | admin123   |
| Dosen      | hendra@unhar.ac.id       | dosen123   |
| Mahasiswa  | anzar@mhs.unhar.ac.id    | 222370066  |

## Reset Database

```bash
php artisan migrate:fresh --seed
```

## Troubleshooting

- "Driver [jwt] not supported" → `composer require tymon/jwt-auth && php artisan jwt:secret`
- "no such table" → `php artisan migrate`
- CORS error → cek `config/cors.php`
