# Membuka asesmen HRD Division PT Serviam Group Shipyard

Paket ini menggunakan identitas **HRD Division PT Serviam Group Shipyard**, logo Serviam, dan urutan soal yang tersimpan per peserta.

Ekstrak seluruh ZIP ke folder proyek, misalnya `alif/talenta-recruitment`. Jika memperbarui proyek lama, pertahankan folder `.data` agar akun dan jawaban tersimpan. Pastikan **Node.js 24 atau lebih baru** terpasang. Aplikasi menggunakan SQLite bawaan Node; tidak memerlukan SQL Server, IIS, atau API key.

## Visual Studio 2022 (Windows)

1. Di **Visual Studio Installer**, pastikan workload **Node.js development** terpasang. File `.vsconfig` menyatakan workload yang diperlukan; Visual Studio dapat menawarkan pemasangan komponen yang belum tersedia.
2. Buka **`Talenta.sln`** melalui **File → Open → Project/Solution** atau klik dua kali file tersebut. Solution memuat `Talenta.njsproj`, dengan `server.js` sebagai startup file.
3. Jika runtime Node yang dipakai Visual Studio berbeda dari Node 24+, buka properti proyek **Talenta** dan atur **Node.exe path** ke instalasi Node 24+ Anda. Proyek memilih instalasi di `Program Files/nodejs` jika tersedia; jika lokasi berbeda, gunakan lokasi `node.exe` sebenarnya.
4. Pilih proyek **Talenta** sebagai startup project apabila diperlukan, lalu tekan **F5**. **Ctrl+F5** menjalankan tanpa debugger. Server membuka browser pada komputer Windows setelah berhasil mulai.
5. Jika browser belum terbuka, buka alamat yang tercetak di output server, biasanya `http://localhost:3000/`.

Format `.njsproj` mengikuti template resmi Microsoft Node.js Tools V2. Pengaturan `StartWebBrowser` milik IDE dinonaktifkan agar pembukaan browser dilakukan oleh server setelah siap dan tidak membuka dua tab. Ini aplikasi Node.js; file `.sln` hanya mengintegrasikannya dengan IDE.

Jika muncul **project type not supported** atau **Microsoft.NodejsToolsV2.targets tidak ditemukan**, tambahkan workload **Node.js development** melalui Visual Studio Installer, lalu buka kembali solution. Node.js 24+ tetap perlu terpasang, terlepas dari runtime yang mungkin disertakan IDE.

## Visual Studio Code

1. Buka **`Talenta.code-workspace`** melalui **File → Open Workspace from File**. Alternatifnya, gunakan **File → Open Folder** dan pilih folder yang berisi `package.json`.
2. Buka **Run and Debug**, pilih **Talenta: jalankan & buka web**, lalu tekan **F5**.
3. VS Code memeriksa Node.js 24+, menjalankan `server.js`, dan membuka browser setelah pesan server siap diterima. Log tampil pada **Debug Console**. Breakpoint dapat dipasang di `server.js` atau `lib/`.
4. Untuk menghentikan server, tekan **Shift+F5** atau tombol Stop pada toolbar debugger.

Konfigurasi tersedia di `.vscode/launch.json`, `.vscode/tasks.json`, dan `.vscode/settings.json`. JavaScript dan debugger Node sudah tersedia di VS Code; tidak perlu memasang Live Server untuk menjalankan aplikasi.

Tugas tambahan tersedia melalui **Terminal → Run Task**:

- **Talenta: buat akun penguji** — terminal interaktif untuk membuat akun pertama saat server sedang berjalan.
- **Talenta: uji aplikasi** — menjalankan 24 pengujian otomatis.
- **Talenta: cek Node.js 24+** — memeriksa runtime sebelum menjalankan aplikasi.

## Akun penguji pertama

Saat web pertama kali terbuka, muncul halaman penyiapan. Dengan server tetap berjalan, buka terminal lain di folder proyek dan jalankan:

```bash
npm run admin:setup
```

Masukkan nama, email, dan kata sandi minimal 12 karakter; kata sandi tidak ditampilkan. Di VS Code, tugas **Talenta: buat akun penguji** menjalankan langkah ini di terminal terpisah. Alternatifnya, gunakan kode lokal `.data/bootstrap-token` pada halaman penyiapan web.

## Jika server tidak berjalan

- Tutup server sebelumnya sebelum F5 jika port 3000 sedang dipakai. Berhenti melalui Stop/Shift+F5 untuk proses IDE, atau Ctrl+C untuk proses terminal yang Anda jalankan.
- Di VS Code, jika memilih port lain, ubah `PORT` pada profil `launch.json`; browser mengikuti port yang tercetak saat server siap.
- Untuk menjalankan dari terminal editor, gunakan `npm start` dari folder proyek. Biarkan terminal tetap terbuka dan gunakan alamat web server.
- Jika `node:sqlite` tidak ditemukan, runtime yang sedang dipakai belum memenuhi kebutuhan. Pilih Node.js 24+ pada PATH atau pengaturan runtime IDE.

## Validasi paket

Konfigurasi JSON/XML, referensi file solution/proyek, jalur relatif workspace, pemeriksaan runtime, serta kecocokan pola server-ready dengan startup aplikasi diperiksa saat paket dibuat. Aplikasi dan 24 pengujiannya dijalankan dari hasil ekstraksi ZIP. Lingkungan pemeriksaan ini tidak menyediakan IDE Visual Studio Windows atau VS Code, sehingga sesi F5 di IDE tersebut belum dijalankan secara langsung.
