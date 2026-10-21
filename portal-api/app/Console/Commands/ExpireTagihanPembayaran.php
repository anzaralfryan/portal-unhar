<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Pembayaran;
use App\Models\Notifikasi;
use Carbon\Carbon;

class ExpireTagihanPembayaran extends Command
{
    protected $signature   = 'pembayaran:expire';
    protected $description = 'Tandai tagihan yang melewati jatuh tempo sebagai kadaluarsa.';

    public function handle(): int
    {
        $expiredCount = 0;

        // Ambil tagihan 'belum' yang jatuh tempo sudah lewat
        $tagihans = Pembayaran::where('status', 'belum')
            ->whereNotNull('jatuh_tempo')
            ->where('jatuh_tempo', '<', Carbon::today())
            ->with('mahasiswa.user')
            ->get();

        foreach ($tagihans as $p) {
            $p->update(['status' => 'kadaluarsa']);

            // Notifikasi ke mahasiswa
            $userId = $p->mahasiswa?->user?->id;
            if ($userId) {
                Notifikasi::create([
                    'user_id' => $userId,
                    'judul'   => 'Tagihan UKT Kadaluarsa',
                    'isi'     => "Tagihan \"{$p->label}\" telah melewati jatuh tempo dan dinyatakan kadaluarsa. Hubungi Admin untuk informasi lebih lanjut.",
                    'tipe'    => 'Pembayaran',
                    'is_read' => false,
                ]);
            }

            $expiredCount++;
        }

        $this->info("Selesai: {$expiredCount} tagihan ditandai kadaluarsa.");
        return Command::SUCCESS;
    }
}
