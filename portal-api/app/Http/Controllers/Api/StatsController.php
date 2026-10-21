<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteVisit;
use App\Models\Mahasiswa;
use App\Models\Dosen;
use Illuminate\Support\Facades\Log;

class StatsController extends Controller
{
    /**
     * GET /api/stats/public
     * Statistik publik untuk ditampilkan di landing page.
     * Tidak memerlukan autentikasi.
     */
    public function public()
    {
        $data = [
            'online_sekarang'     => 0,
            'online_mahasiswa'    => 0,
            'online_dosen'        => 0,
            'kunjungan_hari_ini'  => 0,
            'kunjungan_bulan_ini' => 0,
            'kunjungan_total'     => 0,
            'total_mahasiswa'     => 0,
            'total_dosen'         => 0,
        ];

        try {
            $cutoff = now()->subMinutes(5);
            $data['online_sekarang']     = SiteVisit::where('last_active', '>=', $cutoff)->count();
            $data['online_mahasiswa']    = SiteVisit::where('last_active', '>=', $cutoff)->where('role', 'mahasiswa')->count();
            $data['online_dosen']        = SiteVisit::where('last_active', '>=', $cutoff)->where('role', 'dosen')->count();
            $data['kunjungan_hari_ini']  = SiteVisit::whereDate('created_at', today())->count();
            $data['kunjungan_bulan_ini'] = SiteVisit::whereYear('created_at', now()->year)
                                                     ->whereMonth('created_at', now()->month)->count();
            $data['kunjungan_total']     = SiteVisit::count();
        } catch (\Throwable $e) {
            Log::warning('[Stats] SiteVisit query gagal: ' . $e->getMessage());
        }

        try {
            $data['total_mahasiswa'] = Mahasiswa::where('status', 'aktif')->count();
            $data['total_dosen']     = Dosen::count();
        } catch (\Throwable $e) {
            Log::warning('[Stats] Mahasiswa/Dosen query gagal: ' . $e->getMessage());
        }

        return response()->json(['data' => $data]);
    }
}
