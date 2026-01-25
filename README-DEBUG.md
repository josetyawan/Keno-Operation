# Panduan Darurat: Memperbaiki Izin Unggah Foto Secara Manual

Jika Anda melihat file ini, itu berarti sistem penerapan aturan otomatis kami gagal menyinkronkan perubahan ke server Firebase. Ini adalah situasi yang sangat jarang terjadi.

Kesalahan `storage/unauthorized` yang terus-menerus Anda lihat disebabkan karena aturan di server Firebase Anda masih menolak unggahan, meskipun file `storage.rules` di proyek Anda sudah benar.

**Untuk mengatasi ini, Anda perlu menyalin dan menempelkan aturan yang benar secara manual ke Firebase Console.**

Ikuti langkah-langkah berikut:

### Langkah 1: Salin Aturan yang Benar

Salin **seluruh teks** di dalam kotak di bawah ini. Ini adalah aturan keamanan yang benar untuk Firebase Storage Anda.

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Izinkan siapa saja untuk MEMBACA file (agar gambar bisa tampil)
    match /{allPaths=**} {
      allow read: if true;
    }

    // Hanya izinkan pengguna yang login untuk MENULIS ke folder notas MEREKA SENDIRI
    match /notas/{userId}/{allPaths=**} {
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Langkah 2: Buka Firebase Console

Buka [Firebase Console](https://console.firebase.google.com/) dan navigasikan ke proyek Anda.

1.  Di menu sebelah kiri, klik **Build** > **Storage**.
2.  Di bagian atas halaman Storage, klik tab **Rules**.

### Langkah 3: Tempel dan Publikasikan Aturan Baru

1.  Anda akan melihat editor teks dengan aturan yang ada saat ini (kemungkinan besar yang berisi `allow read, write: if false;`).
2.  **Hapus seluruh teks** yang ada di editor tersebut.
3.  **Tempel (paste)** aturan yang Anda salin dari Langkah 1 ke dalam editor.
4.  Klik tombol **Publish** (atau "Publikasikan").

Setelah Anda mempublikasikan aturan baru, tunggu sekitar satu menit, lalu coba unggah foto nota Anda lagi di aplikasi. Kali ini seharusnya berhasil.

Saya mohon maaf atas ketidaknyamanan yang luar biasa ini. Langkah manual ini seharusnya tidak diperlukan, dan saya berterima kasih atas kesabaran Anda.
