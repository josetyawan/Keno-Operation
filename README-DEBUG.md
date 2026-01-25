# Panduan Debugging Masalah Izin Firebase Storage (Error 403 / Unauthorized)

Jika Anda melihat file ini, itu berarti kita telah mencoba semua perbaikan dari sisi kode, tetapi masalah izin unggah file masih berlanjut. Ini sangat menunjukkan masalahnya ada pada konfigurasi proyek Firebase Anda di **Google Cloud Console**.

Ikuti langkah-langkah ini untuk memeriksanya:

### Langkah 1: Pastikan API yang Diperlukan Aktif

Firebase Storage bergantung pada API Google Cloud. Jika API ini tidak aktif, semua permintaan akan gagal.

1.  Buka Google Cloud Console: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  Pastikan Anda telah memilih proyek yang benar. Nama proyek Anda adalah **`studio-7759201113-b7263`**.
3.  Di bilah pencarian di bagian atas, cari dan buka **"APIs & Services"**.
4.  Klik **"Enabled APIs & services"** (atau "Library" jika Anda tidak dapat menemukannya, lalu cari API-nya).
5.  Pastikan API berikut ada di daftar dan berstatus **Enabled**:
    *   **Cloud Storage API**
    *   **Firebase Storage API** (Terkadang disebut "Cloud Storage for Firebase API")
    *   **Identity and Access Management (IAM) API**
    *   **Firebase Management API**

Jika salah satu dari API di atas tidak aktif (disabled), klik API tersebut dan klik tombol **"ENABLE"**. Tunggu beberapa menit setelah mengaktifkannya, lalu coba unggah file lagi di aplikasi Anda.

### Langkah 2: Coba Lagi

Setelah memeriksa dan memastikan API sudah aktif, coba lagi untuk mengunggah file di aplikasi NotaKu. Ini adalah penyebab paling umum untuk masalah yang membandel seperti ini.

Jika setelah mengikuti langkah-langkah ini masalah masih berlanjut, ini menandakan masalah yang sangat langka pada proyek Anda yang mungkin memerlukan dukungan langsung dari Firebase.
