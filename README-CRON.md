# Panduan Mengaktifkan Cron Job (Jadwal Otomatis)

File `apphosting.yaml` di proyek Anda berisi definisi jadwal otomatis (cron jobs) untuk mengirim laporan secara berkala. Agar jadwal ini dapat berjalan, Anda perlu melakukan deploy aplikasi dan memberikan izin yang benar di Google Cloud.

Ikuti langkah-langkah berikut dengan teliti.

---

### Langkah 1: Deploy Aplikasi Anda ke Firebase

Langkah pertama adalah mengunggah aplikasi dan konfigurasinya ke Firebase. Jika Anda sudah melakukan ini, Anda bisa lanjut ke Langkah 2.

1.  **Buka Terminal atau Command Prompt** di direktori proyek Anda.
2.  Jalankan perintah berikut menggunakan Firebase CLI:
    ```bash
    firebase deploy --only hosting
    ```
3.  Tunggu hingga proses deploy selesai. Perintah ini akan mengunggah kode aplikasi Anda beserta konfigurasi `apphosting.yaml` ke server Firebase. Setelah selesai, Firebase akan secara otomatis mencoba membuat jadwal berdasarkan konfigurasi tersebut di Google Cloud Scheduler.

---

### Langkah 2: Konfigurasi Izin (Permissions) di Google Cloud

Secara default, layanan penjadwalan tidak memiliki izin untuk memanggil aplikasi Anda. Anda harus memberikannya secara manual. Ini adalah langkah **paling penting**.

#### 2.1. Temukan Project Number Anda

1.  Buka [Google Cloud Console](https://console.cloud.google.com/).
2.  Pastikan Anda telah memilih proyek Firebase yang benar di bagian atas halaman.
3.  Di halaman **Dashboard**, cari kartu **Project info** dan temukan **Project number** Anda. Catat nomor ini.

#### 2.2. Siapkan Nama Service Account

Layanan penjadwalan menggunakan *service account* khusus. Format namanya adalah:
`service-<PROJECT_NUMBER>@gcp-sa-cloudscheduler.iam.gserviceaccount.com`

Ganti `<PROJECT_NUMBER>` dengan nomor yang Anda catat pada langkah 2.1.

**Contoh:** Jika *project number* Anda adalah `1234567890`, maka nama *service account*-nya adalah `service-1234567890@gcp-sa-cloudscheduler.iam.gserviceaccount.com`.

#### 2.3. Berikan Peran "Cloud Run Invoker"

1.  Di Google Cloud Console, buka menu navigasi (ikon garis tiga di kiri atas).
2.  Pilih **IAM & Admin** > **IAM**.
3.  Di bagian atas halaman IAM, klik tombol **+ GRANT ACCESS**.
4.  Di kolom **New principals**, tempel (paste) nama *service account* lengkap yang sudah Anda siapkan dari langkah 2.2.
5.  Di bagian **Assign roles**, klik dan cari peran (role) bernama **`Cloud Run Invoker`**. Pilih peran tersebut. Peran ini digunakan karena Firebase App Hosting berjalan di atas infrastruktur Cloud Run.
6.  Klik **Save**.

---

### Langkah 3: Verifikasi Jadwal

Setelah deploy dan mengatur izin, Anda bisa memeriksa apakah jadwal sudah aktif.

1.  Di Google Cloud Console, buka menu navigasi.
2.  Pilih **Cloud Scheduler**.
3.  **PENTING:** Anda akan melihat daftar jadwal (jobs) yang dibuat **secara otomatis** oleh Firebase. Nama jadwal-jadwal ini akan terlihat seperti `firebase-app-hosting-daily-schedule-xxxx`, `firebase-app-hosting-b2c-rekap-xxxx`, dan `firebase-app-hosting-plotting-rekap-xxxx`.
4.  Jika Anda memiliki jadwal yang Anda buat manual sebelumnya (misalnya `kirim-card-otomatis`), Anda bisa **menghapusnya** dengan aman karena sudah tidak digunakan dan akan terus gagal.
5.  Anda bisa mengklik tombol "RUN NOW" pada salah satu jadwal otomatis untuk mengujinya secara manual.

---

### Troubleshooting

-   **Peran "Cloud Run Invoker" Tidak Ditemukan**: Jika Anda tidak dapat menemukannya, coba segarkan halaman setelah 5 menit. Pastikan juga API berikut ini aktif di proyek Anda (biasanya aktif otomatis setelah deploy): **Cloud Run API**, **Cloud Scheduler API**, dan **App Hosting API**.
-   **Jadwal Gagal Berjalan (Status Failed)**: Jika jadwal yang dibuat otomatis oleh Firebase gagal, hampir pasti masalahnya ada pada izin di Langkah 2. Pastikan Anda memberikan peran ke *principal* yang benar. Jika jadwal yang dibuat manual yang gagal, itu karena target URL-nya sudah tidak valid.

---

**Penting:**
Setiap kali Anda mengubah jadwal di file `apphosting.yaml`, Anda **harus melakukan deploy ulang** (Langkah 1) agar perubahan tersebut diterapkan. Anda tidak perlu mengatur izin lagi.