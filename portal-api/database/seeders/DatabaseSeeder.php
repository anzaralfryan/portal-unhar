<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\{User, Mahasiswa, Dosen, Fakultas, Prodi, Matkul, TahunAkademik, Jadwal, Krs, KrsDetail, Nilai, Pembayaran, Notifikasi};

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Admin ─────────────────────────────────────
        $admin = User::create([
            'name'      => 'Administrator',
            'email'     => 'admin@unhar.ac.id',
            'password'  => Hash::make('admin123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        // ── 2. Fakultas & Prodi ───────────────────────────
        $fti = Fakultas::create(['nama' => 'Fakultas Teknologi Industri', 'kode' => 'FTI']);
        $feb = Fakultas::create(['nama' => 'Fakultas Ekonomi & Bisnis',   'kode' => 'FEB']);

        $informatika = Prodi::create(['fakultas_id' => $fti->id, 'nama' => 'Teknik Informatika',    'kode' => 'TI']);
        $sipil       = Prodi::create(['fakultas_id' => $fti->id, 'nama' => 'Teknik Sipil',           'kode' => 'TS']);
        $manajemen   = Prodi::create(['fakultas_id' => $feb->id, 'nama' => 'Manajemen',              'kode' => 'MN']);

        // ── 3. Dosen ──────────────────────────────────────
        $dosenUsers = [
            ['name'=>'Dr. Hendra Kurniawan, M.Kom.', 'email'=>'hendra@unhar.ac.id',  'nip'=>'197501012000031001', 'jabatan'=>'Lektor Kepala', 'prodi_id'=>$informatika->id],
            ['name'=>'Prof. Sari Dewi, Ph.D.',        'email'=>'sari@unhar.ac.id',    'nip'=>'196803151992032002', 'jabatan'=>'Profesor',       'prodi_id'=>$informatika->id],
            ['name'=>'Dr. Andi Saputra, M.T.',        'email'=>'andi@unhar.ac.id',    'nip'=>'198002202005011003', 'jabatan'=>'Lektor',         'prodi_id'=>$informatika->id],
            ['name'=>'Ir. Budi Santoso, M.T.',        'email'=>'budi@unhar.ac.id',    'nip'=>'197612052003121004', 'jabatan'=>'Lektor',         'prodi_id'=>$informatika->id],
            ['name'=>'M. Fadhil, M.T.',               'email'=>'fadhil@unhar.ac.id',  'nip'=>'198505142009011005', 'jabatan'=>'Asisten Ahli',   'prodi_id'=>$informatika->id],
        ];

        $dosenModels = [];
        foreach ($dosenUsers as $d) {
            $user = User::create([
                'name' => $d['name'], 'email' => $d['email'],
                'password' => Hash::make('dosen123'), 'role' => 'dosen', 'is_active' => true,
            ]);
            $dosenModels[] = Dosen::create([
                'user_id' => $user->id, 'nip' => $d['nip'],
                'prodi_id' => $d['prodi_id'], 'jabatan' => $d['jabatan'],
            ]);
        }

        [$hendra, $sari, $andi, $budi, $fadhil] = $dosenModels;

        // ── 4. Mata Kuliah ────────────────────────────────
        $matkulData = [
            ['kode'=>'IF501','nama'=>'Pemrograman Web',            'sks'=>3,'semester'=>5,'prodi_id'=>$informatika->id,'dosen'=>$hendra],
            ['kode'=>'IF502','nama'=>'Basis Data Lanjut',          'sks'=>3,'semester'=>5,'prodi_id'=>$informatika->id,'dosen'=>$sari],
            ['kode'=>'IF503','nama'=>'Kecerdasan Buatan',          'sks'=>3,'semester'=>5,'prodi_id'=>$informatika->id,'dosen'=>$andi],
            ['kode'=>'IF504','nama'=>'Rekayasa Perangkat Lunak',   'sks'=>2,'semester'=>5,'prodi_id'=>$informatika->id,'dosen'=>$budi],
            ['kode'=>'IF505','nama'=>'Jaringan Komputer',          'sks'=>3,'semester'=>5,'prodi_id'=>$informatika->id,'dosen'=>$fadhil],
        ];

        $matkulModels = [];
        foreach ($matkulData as $m) {
            $matkulModels[$m['kode']] = ['model' => Matkul::create([
                'kode' => $m['kode'], 'nama' => $m['nama'],
                'sks'  => $m['sks'],  'semester' => $m['semester'], 'prodi_id' => $m['prodi_id'],
            ]), 'dosen' => $m['dosen']];
        }

        // ── 5. Tahun Akademik ─────────────────────────────
        $tahun = TahunAkademik::create(['tahun' => '2024/2025', 'semester' => 'Ganjil', 'is_aktif' => true]);
        $tahunLalu = TahunAkademik::create(['tahun' => '2023/2024', 'semester' => 'Genap', 'is_aktif' => false]);

        // ── 6. Jadwal ─────────────────────────────────────
        $jadwalData = [
            ['kode'=>'IF501','hari'=>'Senin',   'mulai'=>'08:00','selesai'=>'10:30','ruang'=>'RK 301','type'=>'pagi'],
            ['kode'=>'IF502','hari'=>'Senin',   'mulai'=>'13:00','selesai'=>'15:30','ruang'=>'Lab B', 'type'=>'pagi'],
            ['kode'=>'IF503','hari'=>'Rabu',    'mulai'=>'09:00','selesai'=>'11:00','ruang'=>'RK 204','type'=>'pagi'],
            ['kode'=>'IF504','hari'=>'Selasa',  'mulai'=>'10:00','selesai'=>'12:00','ruang'=>'RK 105','type'=>'pagi'],
            ['kode'=>'IF505','hari'=>'Jumat',   'mulai'=>'08:00','selesai'=>'10:00','ruang'=>'Lab Jaringan','type'=>'pagi'],
        ];

        $jadwalModels = [];
        foreach ($jadwalData as $j) {
            $mk = $matkulModels[$j['kode']];
            $jadwalModels[$j['kode']] = Jadwal::create([
                'matkul_id'         => $mk['model']->id,
                'dosen_id'          => $mk['dosen']->id,
                'tahun_akademik_id' => $tahun->id,
                'hari'              => $j['hari'],
                'jam_mulai'         => $j['mulai'],
                'jam_selesai'       => $j['selesai'],
                'ruang'             => $j['ruang'],
                'kelas_type'        => $j['type'],
            ]);
        }

        // ── 7. Mahasiswa demo ─────────────────────────────
        $mahasiswaData = [
            ['name'=>'Anzar Alfryan Lubis',   'email'=>'anzar@mhs.unhar.ac.id',   'nim'=>'222370066'],
            ['name'=>'Siti Rahayu',    'email'=>'siti@mhs.unhar.ac.id',    'nim'=>'2021001235'],
            ['name'=>'Budi Prasetyo',  'email'=>'budi.mhs@mhs.unhar.ac.id','nim'=>'2021001236'],
        ];

        foreach ($mahasiswaData as $idx => $m) {
            $user = User::create([
                'name' => $m['name'], 'email' => $m['email'],
                'password' => Hash::make($m['nim']), 'role' => 'mahasiswa', 'is_active' => true,
            ]);

            $mhs = Mahasiswa::create([
                'user_id'  => $user->id,
                'nim'      => $m['nim'],
                'prodi_id' => $informatika->id,
                'angkatan' => 2021,
                'semester' => 5,
                'kelas'    => 'pagi',
                'status'   => 'aktif',
            ]);

            // KRS semester aktif
            $krs = Krs::create([
                'mahasiswa_id'      => $mhs->id,
                'tahun_akademik_id' => $tahun->id,
                'status'            => 'diajukan',
            ]);

            // Tambah semua matkul ke KRS
            foreach ($jadwalModels as $jm) {
                KrsDetail::create(['krs_id' => $krs->id, 'jadwal_id' => $jm->id]);
            }

            // Nilai semester lalu
            $nilai = [
                ['IF501',3,'A', 90,'A-',86,'B+',80,'A',91],
                ['IF502',3,'A-',85,'B+',79,'A', 88,'A-',85],
                ['IF503',3,'B+',80,'B', 75,'B+',82,'B+',78],
            ];

            foreach (array_slice($nilai, 0, 3) as $n) {
                [$kode, $sks, $h1,$a1,$h2,$a2,$h3,$a3,$h4,$a4] = $n;
                $mk = $matkulModels[$kode]['model'];
                Nilai::create([
                    'mahasiswa_id'      => $mhs->id,
                    'matkul_id'         => $mk->id,
                    'tahun_akademik_id' => $tahunLalu->id,
                    'dosen_id'          => $matkulModels[$kode]['dosen']->id,
                    'nilai_huruf'       => $h1,
                    'nilai_angka'       => $a1,
                    'nilai_uts'         => $a2,
                    'nilai_uas'         => $a3,
                    'nilai_tugas'       => $a4,
                    'nilai_kehadiran'   => 90,
                ]);
            }

            // Pembayaran
            Pembayaran::create([
                'mahasiswa_id'      => $mhs->id,
                'tahun_akademik_id' => $tahun->id,
                'label'             => 'UKT Semester Ganjil 2024/2025',
                'jumlah'            => 4500000,
                'kode_va'           => '8277' . str_pad($mhs->id, 12, '0', STR_PAD_LEFT),
                'jatuh_tempo'       => '2025-01-25',
                'status'            => $idx === 0 ? 'belum' : 'lunas',
                'metode'            => $idx !== 0 ? 'Transfer BCA' : null,
                'tanggal_bayar'     => $idx !== 0 ? '2024-08-15' : null,
            ]);

            Pembayaran::create([
                'mahasiswa_id'      => $mhs->id,
                'tahun_akademik_id' => $tahunLalu->id,
                'label'             => 'UKT Semester Genap 2023/2024',
                'jumlah'            => 4500000,
                'kode_va'           => '8277' . str_pad($mhs->id + 100, 12, '0', STR_PAD_LEFT),
                'status'            => 'lunas',
                'metode'            => 'GoPay',
                'tanggal_bayar'     => '2024-02-10',
            ]);

            // Notifikasi
            Notifikasi::create([
                'user_id' => $user->id,
                'judul'   => 'Selamat Datang di Portal Unhar!',
                'isi'     => 'Akun Anda telah aktif. Silakan lengkapi KRS semester ini.',
                'tipe'    => 'Akademik',
                'is_read' => false,
            ]);

            Notifikasi::create([
                'user_id' => $user->id,
                'judul'   => 'Tagihan UKT Menunggu Pembayaran',
                'isi'     => 'Rp 4.500.000 jatuh tempo 25 Januari 2025. Segera lakukan pembayaran.',
                'tipe'    => 'Pembayaran',
                'is_read' => false,
            ]);
        }

        $this->command->info('✓ Seeder selesai!');
        $this->command->info('  Admin    : admin@unhar.ac.id / admin123');
        $this->command->info('  Dosen    : hendra@unhar.ac.id / dosen123');
        $this->command->info('  Mahasiswa: anzar@mhs.unhar.ac.id / 222370066 (NIM)');
    }
}
