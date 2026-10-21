<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Expire tagihan yang melewati jatuh tempo — berjalan tiap hari jam 00:05
Schedule::command('pembayaran:expire')->dailyAt('00:05');